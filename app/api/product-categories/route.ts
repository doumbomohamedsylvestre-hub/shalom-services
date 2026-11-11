import { requireSession } from "@/server/auth/session";
import { handle } from "@/server/errors";
import { createProductCategory, listProductCategories } from "@/server/services/inventory";

export async function GET() {
  return handle(async () => listProductCategories(await requireSession()));
}

export async function POST(request: Request) {
  return handle(async () => createProductCategory(await requireSession(), await request.json()), { status: 201 });
}
