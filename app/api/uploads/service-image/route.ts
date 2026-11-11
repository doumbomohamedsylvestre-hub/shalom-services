import { requireSession } from "@/server/auth/session";
import { handle } from "@/server/errors";
import { requestServiceImageUpload } from "@/server/services/settings";

/** Returns a 5-minute presigned PUT URL for a compressed service image. */
export async function POST(request: Request) {
  return handle(async () => requestServiceImageUpload(await requireSession(), await request.json()));
}
