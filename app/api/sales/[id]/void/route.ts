import { requireSession } from "@/server/auth/session";
import { handle } from "@/server/errors";
import { voidSale } from "@/server/services/sales";

export async function POST(request: Request, ctx: RouteContext<"/api/sales/[id]/void">) {
  return handle(async () => {
    const session = await requireSession();
    const { id } = await ctx.params;
    return voidSale(session, id, await request.json());
  });
}
