import { requireSession } from "@/server/auth/session";
import { handle } from "@/server/errors";
import { saveProduct } from "@/server/services/inventory";

export async function PATCH(request: Request, ctx: RouteContext<"/api/products/[id]">) {
  return handle(async () => {
    const session = await requireSession();
    const { id } = await ctx.params;
    return saveProduct(session, await request.json(), id);
  });
}
