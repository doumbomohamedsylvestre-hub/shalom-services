import { requireSession } from "@/server/auth/session";
import { handle } from "@/server/errors";
import * as repairs from "@/server/services/repairs";

export async function POST(request: Request, ctx: RouteContext<"/api/repairs/[id]/assign">) {
  return handle(async () => {
    const session = await requireSession();
    const { id } = await ctx.params;
    const body = (await request.json()) as { technicianId?: string | null };
    return repairs.assignRepair(session, id, body.technicianId ?? null);
  });
}
