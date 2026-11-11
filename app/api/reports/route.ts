import { requireSession } from "@/server/auth/session";
import { handle } from "@/server/errors";
import { getReport } from "@/server/services/reports";
import type { ReportRange } from "@/shared/domain/types";

export async function GET(request: Request) {
  const range = (new URL(request.url).searchParams.get("range") ?? "30d") as ReportRange;
  return handle(async () => getReport(await requireSession(), range));
}
