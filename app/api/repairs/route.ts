import { requireSession } from "@/server/auth/session";
import { handle } from "@/server/errors";
import * as repairs from "@/server/services/repairs";
import type { RepairStatus } from "@/shared/domain/types";

export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  return handle(async () =>
    repairs.listRepairs(await requireSession(), {
      q: p.get("q") ?? undefined,
      status: (p.get("status") as RepairStatus | "open" | "all" | null) ?? undefined,
      technicianId: p.get("technicianId") ?? undefined,
    }),
  );
}

export async function POST(request: Request) {
  return handle(async () => repairs.createRepair(await requireSession(), await request.json()), { status: 201 });
}
