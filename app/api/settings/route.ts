import { requireSession } from "@/server/auth/session";
import { handle } from "@/server/errors";
import { getSettings, saveSettings } from "@/server/services/settings";

export async function GET() {
  return handle(async () => getSettings(await requireSession()));
}

export async function PUT(request: Request) {
  return handle(async () => saveSettings(await requireSession(), await request.json()));
}
