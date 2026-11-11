"use client";

/**
 * Shrinks a photo before upload (SPEC §4: images are compressed on the client):
 * at most 1600 px on the long side, WebP at quality 0.82 (JPEG where the
 * browser cannot encode WebP). A phone photo of 4–8 MB becomes ~150–300 KB.
 */
export async function compressImage(file: File, maxSide = 1600): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Choisissez une image (JPEG, PNG ou WebP).");
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => {
    throw new Error("Image illisible. Essayez une autre photo.");
  });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const encode = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.82));
  const webp = await encode("image/webp");
  if (webp && webp.type === "image/webp") return webp;
  const jpeg = await encode("image/jpeg");
  if (!jpeg) throw new Error("Compression impossible sur ce navigateur.");
  return jpeg;
}
