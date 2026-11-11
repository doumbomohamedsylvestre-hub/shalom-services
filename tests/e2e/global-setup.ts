/**
 * Creates fresh e2e staff accounts on the Neon "test" branch (one per role)
 * with a random password, saved for the specs in tests/e2e/.auth/ (gitignored).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { setDefaultResultOrder } from "node:dns";
import { loadEnvConfig } from "@next/env";

export default async function globalSetup() {
  (process.env as Record<string, string>).NODE_ENV = "test";
  loadEnvConfig(process.cwd());
  setDefaultResultOrder("ipv4first");
  const { auth } = await import("../../server/auth/auth");
  const { db } = await import("../../server/db/client");

  const run = randomBytes(3).toString("hex");
  const password = `e2e-${randomBytes(9).toString("base64url")}`;
  const users: Record<string, { username: string; name: string }> = {};
  for (const [role, name] of [
    ["admin", "Admin E2E"],
    ["reception", "Réception E2E"],
    ["technician", "Technicien E2E"],
  ] as const) {
    const username = `e2e.${role.slice(0, 4)}.${run}`;
    await auth.api.createUser({ body: { email: `${username}@staff.invalid`, password, name, role, data: { username, displayUsername: username } } });
    users[role] = { username, name };
  }
  await db.$client.end();
  mkdirSync("tests/e2e/.auth", { recursive: true });
  writeFileSync("tests/e2e/.auth/users.json", JSON.stringify({ password, users }, null, 2));
}
