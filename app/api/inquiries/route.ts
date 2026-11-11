import { requireSession } from "@/server/auth/session";
import { handle } from "@/server/errors";
import * as inquiries from "@/server/services/inquiries";

export async function GET() {
  return handle(async () => inquiries.listInquiries(await requireSession()));
}
