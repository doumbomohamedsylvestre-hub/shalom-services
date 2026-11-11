import { requireSession } from "@/server/auth/session";
import { handle } from "@/server/errors";
import { getCustomer, saveCustomer } from "@/server/services/customers";

export async function GET(_request: Request, ctx: RouteContext<"/api/customers/[id]">) {
  return handle(async () => {
    const session = await requireSession();
    const { id } = await ctx.params;
    return getCustomer(session, id);
  });
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/customers/[id]">) {
  return handle(async () => {
    const session = await requireSession();
    const { id } = await ctx.params;
    return saveCustomer(session, await request.json(), id);
  });
}
