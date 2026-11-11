import { requireSession } from "@/server/auth/session";
import { handle } from "@/server/errors";
import { listProducts, saveProduct } from "@/server/services/inventory";

export async function GET() {
  return handle(async () => listProducts(await requireSession()));
}

export async function POST(request: Request) {
  return handle(async () => saveProduct(await requireSession(), await request.json()), { status: 201 });
}
