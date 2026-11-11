import { requireSession } from "@/server/auth/session";
import { handle } from "@/server/errors";
import { listCustomers, saveCustomer } from "@/server/services/customers";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? undefined;
  return handle(async () => listCustomers(await requireSession(), q));
}

export async function POST(request: Request) {
  return handle(async () => saveCustomer(await requireSession(), await request.json()), { status: 201 });
}
