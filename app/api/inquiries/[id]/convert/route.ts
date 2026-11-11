import { requireSession } from "@/server/auth/session";
import { handle } from "@/server/errors";
import * as inquiries from "@/server/services/inquiries";

export async function POST(_request: Request, ctx: RouteContext<"/api/inquiries/[id]/convert">) {
  return handle(async () => {
    const session = await requireSession();
    const { id } = await ctx.params;
    return inquiries.convertInquiry(session, id);
  });
}
