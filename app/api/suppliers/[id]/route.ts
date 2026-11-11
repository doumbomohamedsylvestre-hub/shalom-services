import { requireSession } from "@/server/auth/session";
import { handle } from "@/server/errors";
import { saveSupplier } from "@/server/services/inventory";

export async function PATCH(request: Request, ctx: RouteContext<"/api/suppliers/[id]">) {
  return handle(async () => {
    const session = await requireSession();
    const { id } = await ctx.params;
    return saveSupplier(session, await request.json(), id);
  });
}
