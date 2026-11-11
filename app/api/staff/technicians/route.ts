import { requireSession } from "@/server/auth/session";
import { handle } from "@/server/errors";
import { listTechnicians } from "@/server/services/staff";

export async function GET() {
  return handle(async () => listTechnicians(await requireSession()));
}
