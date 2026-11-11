import { requireSession } from "@/server/auth/session";
import { handle } from "@/server/errors";
import { receiveStock } from "@/server/services/inventory";

export async function POST(request: Request) {
  return handle(async () => receiveStock(await requireSession(), await request.json()));
}
