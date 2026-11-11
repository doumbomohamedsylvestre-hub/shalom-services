import { requireSession } from "@/server/auth/session";
import { handle } from "@/server/errors";
import { updateStaff } from "@/server/services/staff";

export async function PATCH(request: Request, ctx: RouteContext<"/api/staff/[id]">) {
  return handle(async () => {
    const session = await requireSession();
    const { id } = await ctx.params;
    return updateStaff(session, id, await request.json());
  });
}
