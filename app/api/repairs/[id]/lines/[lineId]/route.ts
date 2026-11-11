import { requireSession } from "@/server/auth/session";
import { handle } from "@/server/errors";
import * as repairs from "@/server/services/repairs";

export async function DELETE(_request: Request, ctx: RouteContext<"/api/repairs/[id]/lines/[lineId]">) {
  return handle(async () => {
    const session = await requireSession();
    const { id, lineId } = await ctx.params;
    return repairs.removeRepairLine(session, id, lineId);
  });
}
