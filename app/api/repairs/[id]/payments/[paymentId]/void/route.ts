import { requireSession } from "@/server/auth/session";
import { handle } from "@/server/errors";
import * as repairs from "@/server/services/repairs";

export async function POST(request: Request, ctx: RouteContext<"/api/repairs/[id]/payments/[paymentId]/void">) {
  return handle(async () => {
    const session = await requireSession();
    const { id, paymentId } = await ctx.params;
    return repairs.voidRepairPayment(session, id, paymentId, await request.json());
  });
}
