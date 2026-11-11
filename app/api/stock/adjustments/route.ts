import { requireSession } from "@/server/auth/session";
import { handle } from "@/server/errors";
import { adjustStock } from "@/server/services/inventory";

export async function POST(request: Request) {
  return handle(async () => adjustStock(await requireSession(), await request.json()), { status: 201 });
}
