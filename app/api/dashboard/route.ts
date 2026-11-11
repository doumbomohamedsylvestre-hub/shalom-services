import { requireSession } from "@/server/auth/session";
import { handle } from "@/server/errors";
import { dashboardSummary } from "@/server/services/summary";

export async function GET() {
  return handle(async () => dashboardSummary(await requireSession()));
}
