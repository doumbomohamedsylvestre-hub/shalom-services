import { requireSession } from "@/server/auth/session";
import { handle } from "@/server/errors";
import { voidExpense } from "@/server/services/expenses";

export async function POST(request: Request, ctx: RouteContext<"/api/expenses/[id]/void">) {
  return handle(async () => {
    const session = await requireSession();
    const { id } = await ctx.params;
    return voidExpense(session, id, await request.json());
  });
}
