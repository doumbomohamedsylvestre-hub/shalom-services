import { requireSession } from "@/server/auth/session";
import { handle } from "@/server/errors";
import { voidReceipt } from "@/server/services/inventory";

export async function POST(request: Request, ctx: RouteContext<"/api/stock/receipts/[id]/void">) {
  return handle(async () => {
    const session = await requireSession();
    const { id } = await ctx.params;
    return voidReceipt(session, id, await request.json());
  });
}
