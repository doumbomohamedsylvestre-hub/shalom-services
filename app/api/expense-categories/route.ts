import { requireSession } from "@/server/auth/session";
import { handle } from "@/server/errors";
import { createExpenseCategory, listExpenseCategories } from "@/server/services/expenses";

export async function GET() {
  return handle(async () => listExpenseCategories(await requireSession()));
}

export async function POST(request: Request) {
  return handle(async () => createExpenseCategory(await requireSession(), await request.json()), { status: 201 });
}
