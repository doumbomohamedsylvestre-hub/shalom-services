import { requireSession } from "@/server/auth/session";
import { handle } from "@/server/errors";
import { resetStaffPassword } from "@/server/services/staff";

export async function POST(request: Request, ctx: RouteContext<"/api/staff/[id]/password">) {
  return handle(async () => {
    const session = await requireSession();
    const { id } = await ctx.params;
    return resetStaffPassword(session, id, await request.json());
  });
}
