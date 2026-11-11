import { requireSession } from "@/server/auth/session";
import { handle } from "@/server/errors";
import { createStaff, listStaff } from "@/server/services/staff";

export async function GET() {
  return handle(async () => listStaff(await requireSession()));
}

export async function POST(request: Request) {
  return handle(async () => createStaff(await requireSession(), await request.json()), { status: 201 });
}
