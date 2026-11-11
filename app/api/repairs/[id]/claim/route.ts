import { requireSession } from "@/server/auth/session";
import { handle } from "@/server/errors";
import * as repairs from "@/server/services/repairs";

export async function POST(_request: Request, ctx: RouteContext<"/api/repairs/[id]/claim">) {
  return handle(async () => {
    const session = await requireSession();
    const { id } = await ctx.params;
    return repairs.claimRepair(session, id);
  });
}
