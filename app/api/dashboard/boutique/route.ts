import { requireSession } from "@/server/auth/session";
import { handle } from "@/server/errors";
import { boutiqueSummary } from "@/server/services/dashboard";

export async function GET() {
  return handle(async () => boutiqueSummary(await requireSession()));
}
