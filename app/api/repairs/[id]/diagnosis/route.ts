import { requireSession } from "@/server/auth/session";
import { handle } from "@/server/errors";
import * as repairs from "@/server/services/repairs";

export async function PUT(request: Request, ctx: RouteContext<"/api/repairs/[id]/diagnosis">) {
  return handle(async () => {
    const session = await requireSession();
    const { id } = await ctx.params;
    return repairs.updateRepairDiagnosis(session, id, await request.json());
  });
}
