import { requireSession } from "@/server/auth/session";
import { handle } from "@/server/errors";
import { saveService } from "@/server/services/settings";

export async function PATCH(request: Request, ctx: RouteContext<"/api/services/[id]">) {
  return handle(async () => {
    const session = await requireSession();
    const { id } = await ctx.params;
    return saveService(session, await request.json(), id);
  });
}
