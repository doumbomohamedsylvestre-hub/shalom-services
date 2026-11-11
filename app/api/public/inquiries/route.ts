import { handle } from "@/server/errors";
import { clientIp } from "@/server/request";
import * as inquiries from "@/server/services/inquiries";

/** Public: contact, quote and repair request forms (honeypot + per-IP rate limit). */
export async function POST(request: Request) {
  return handle(async () => inquiries.submitInquiry(await request.json(), clientIp(request)), { status: 201 });
}
