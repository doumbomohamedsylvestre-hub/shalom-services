import { requireSession } from "@/server/auth/session";
import { handle } from "@/server/errors";
import { getSale } from "@/server/services/sales";

export async function GET(_request: Request, ctx: RouteContext<"/api/sales/[id]">) {
  return handle(async () => {
    const session = await requireSession();
    const { id } = await ctx.params;
    return getSale(session, id);
  });
}
