/**
 * Neon object storage (S3-compatible) for site images only (SPEC §4).
 * The browser compresses the image, asks for a short-lived presigned PUT URL,
 * then uploads straight to the bucket; the database stores the public URL.
 *
 * Env (AWS-standard names, branch-scoped credentials from Neon):
 * AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_ENDPOINT_URL_S3, AWS_REGION,
 * STORAGE_BUCKET (a public_read bucket, e.g. "site-images").
 */
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { AppError } from "./errors";

const ALLOWED_TYPES = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" } as const;
export type ImageContentType = keyof typeof ALLOWED_TYPES;
/** After client-side compression a service image is ~100–300 KB; 3 MB leaves room. */
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

function config() {
  const endpoint = process.env.AWS_ENDPOINT_URL_S3?.replace(/\/+$/, "");
  const bucket = process.env.STORAGE_BUCKET;
  if (!endpoint || !bucket || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) return null;
  return { endpoint, bucket, region: process.env.AWS_REGION ?? "us-east-1" };
}

let client: S3Client | null = null;
function s3(cfg: NonNullable<ReturnType<typeof config>>) {
  // Neon requires path-style addressing; credentials come from the AWS env chain.
  client ??= new S3Client({ endpoint: cfg.endpoint, region: cfg.region, forcePathStyle: true });
  return client;
}

/** Public base URL of the bucket (objects are anonymously readable). */
export function publicBaseUrl() {
  const cfg = config();
  return cfg ? `${cfg.endpoint}/${cfg.bucket}` : null;
}

/** True when `url` is one of our bundled assets or an object in our bucket. */
export function isAllowedImageUrl(url: string) {
  if (/^\/assets\/[\w./-]+\.(webp|jpe?g|png)$/.test(url)) return true;
  const base = publicBaseUrl();
  return !!base && url.startsWith(`${base}/services/`) && /^[\w-]+\.(webp|jpg|png)$/.test(url.slice(base.length + "/services/".length));
}

export async function presignServiceImageUpload(contentType: string, size: number) {
  const cfg = config();
  if (!cfg) throw new AppError("STORAGE_NOT_CONFIGURED", "Le stockage des images n'est pas configuré sur ce serveur.", 503);
  const ext = ALLOWED_TYPES[contentType as ImageContentType];
  if (!ext) throw new AppError("INVALID_IMAGE_TYPE", "Format accepté : WebP, JPEG ou PNG.", 422);
  if (!Number.isInteger(size) || size <= 0 || size > MAX_IMAGE_BYTES) throw new AppError("IMAGE_TOO_LARGE", "Image trop lourde (3 Mo maximum).", 422);

  // A new key per upload: caches never serve a stale image, the row points at the new one.
  const key = `services/${crypto.randomUUID()}.${ext}`;
  const command = new PutObjectCommand({ Bucket: cfg.bucket, Key: key, ContentType: contentType, ContentLength: size });
  const uploadUrl = await getSignedUrl(s3(cfg), command, { expiresIn: 300 });
  return { uploadUrl, publicUrl: `${cfg.endpoint}/${cfg.bucket}/${key}`, headers: { "content-type": contentType } };
}
