import { requireSession } from "@/server/auth/session";
import { handle } from "@/server/errors";
import { createSale, listSales } from "@/server/services/sales";

export async function GET() {
  return handle(async () => listSales(await requireSession()));
}

export async function POST(request: Request) {
  return handle(async () => createSale(await requireSession(), await request.json()), { status: 201 });
}
