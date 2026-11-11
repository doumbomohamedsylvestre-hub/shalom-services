import { requireSession } from "@/server/auth/session";
import { handle } from "@/server/errors";
import { listServices, saveService } from "@/server/services/settings";

export async function GET(request: Request) {
  const publicOnly = new URL(request.url).searchParams.get("public") === "1";
  return handle(async () => listServices(await requireSession(), { publicOnly }));
}

export async function POST(request: Request) {
  return handle(async () => saveService(await requireSession(), await request.json()), { status: 201 });
}
