import { requireSession } from "@/server/auth/session";
import { handle } from "@/server/errors";
import { createExpense, listExpenses } from "@/server/services/expenses";

export async function GET() {
  return handle(async () => listExpenses(await requireSession()));
}

export async function POST(request: Request) {
  return handle(async () => createExpense(await requireSession(), await request.json()), { status: 201 });
}
