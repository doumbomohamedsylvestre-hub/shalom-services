import { requireSession } from "@/server/auth/session";
import { handle } from "@/server/errors";
import { listReceipts, receiveStock } from "@/server/services/inventory";

export async function GET() {
  return handle(async () => listReceipts(await requireSession()));
}

export async function POST(request: Request) {
  return handle(async () => receiveStock(await requireSession(), await request.json()));
}
