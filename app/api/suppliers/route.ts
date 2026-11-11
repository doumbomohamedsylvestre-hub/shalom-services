import { requireSession } from "@/server/auth/session";
import { handle } from "@/server/errors";
import { listSuppliers, saveSupplier } from "@/server/services/inventory";

export async function GET() {
  return handle(async () => listSuppliers(await requireSession()));
}

export async function POST(request: Request) {
  return handle(async () => saveSupplier(await requireSession(), await request.json()), { status: 201 });
}
