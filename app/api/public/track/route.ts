import { handle } from "@/server/errors";
import { clientIp } from "@/server/request";
import * as inquiries from "@/server/services/inquiries";

/** Public: repair tracking by code + phone (per-IP rate limit, no enumeration). */
export async function POST(request: Request) {
  return handle(async () => inquiries.trackRepair(await request.json(), clientIp(request)));
}
