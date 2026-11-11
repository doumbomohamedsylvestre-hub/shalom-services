import { requireSession } from "@/server/auth/session";
import { handle } from "@/server/errors";
import { listMovements } from "@/server/services/inventory";

export async function GET(request: Request) {
  const productId = new URL(request.url).searchParams.get("productId") ?? undefined;
  return handle(async () => listMovements(await requireSession(), productId));
}
