import { requireSession } from "@/server/auth/session";
import { handle } from "@/server/errors";
import { listAudit } from "@/server/services/audit";

export async function GET() {
  return handle(async () => listAudit(await requireSession()));
}
