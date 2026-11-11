import { requireSession } from "@/server/auth/session";
import { handle } from "@/server/errors";
import * as repairs from "@/server/services/repairs";
import type { RepairStatus } from "@/shared/domain/types";

export async function POST(request: Request, ctx: RouteContext<"/api/repairs/[id]/status">) {
  return handle(async () => {
    const session = await requireSession();
    const { id } = await ctx.params;
    const body = (await request.json()) as { to: RepairStatus; note?: string };
    return repairs.changeRepairStatus(session, id, body.to, body.note);
  });
}
