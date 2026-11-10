// Idempotent seed: the shop's branch row and the first admin account.
// Usage: npm run db:seed   (reads .env.local; safe to run repeatedly)
//
// Required env: SEED_ADMIN_USERNAME, SEED_ADMIN_PASSWORD. Optional: SEED_ADMIN_NAME.
// The admin should change the password after first login.
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  // Imported after env is loaded: the db client reads DATABASE_URL at import time.
  const { eq } = await import("drizzle-orm");
  const { db } = await import("../server/db/client");
  const { branches, user } = await import("../server/db/schema");
  const { auth } = await import("../server/auth/auth");

  const [existingBranch] = await db.select({ id: branches.id }).from(branches).limit(1);
  if (existingBranch) {
    console.log("[seed] branch already exists");
  } else {
    await db.insert(branches).values({ name: "Boutique principale" });
    console.log("[seed] created branch 'Boutique principale'");
  }

  const username = process.env.SEED_ADMIN_USERNAME?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!username || !password) {
    throw new Error("SEED_ADMIN_USERNAME and SEED_ADMIN_PASSWORD must be set");
  }

  const [existingAdmin] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.username, username))
    .limit(1);
  if (existingAdmin) {
    console.log(`[seed] user '${username}' already exists, left unchanged`);
  } else {
    // Server-side admin API: works with public sign-up disabled.
    await auth.api.createUser({
      body: {
        email: `${username}@staff.invalid`,
        password,
        name: process.env.SEED_ADMIN_NAME ?? "Administrateur",
        role: "admin",
        data: { username, displayUsername: username },
      },
    });
    console.log(`[seed] created admin '${username}'`);
  }

  await db.$client.end();
}

main().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
