// Idempotent seed: the shop's branch row and the first admin account.
// Usage: npm run db:seed   (reads .env.local; safe to run repeatedly)
//
// Required env: SEED_ADMIN_USERNAME, SEED_ADMIN_PASSWORD. Optional: SEED_ADMIN_NAME.
// The admin should change the password after first login.
//
// Optional, local/preview only: SEED_STAFF_PASSWORD also creates the sample
// reception and technician accounts below (same names as the demo data), all
// with that password. Never set it for production.
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

/** Sample staff for local and preview databases, one per non-admin role. */
const SAMPLE_STAFF = [
  { username: "aissata", name: "Aïssata Coulibaly", role: "reception" },
  { username: "ibrahim", name: "Ibrahim Diarra", role: "technician" },
  { username: "seydou", name: "Seydou Keïta", role: "technician" },
] as const;

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

  const staffPassword = process.env.SEED_STAFF_PASSWORD;
  if (staffPassword) {
    if (process.env.VERCEL_ENV === "production") {
      throw new Error("SEED_STAFF_PASSWORD must not be set in production");
    }
    for (const s of SAMPLE_STAFF) {
      const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.username, s.username)).limit(1);
      if (existing) {
        console.log(`[seed] user '${s.username}' already exists, left unchanged`);
        continue;
      }
      await auth.api.createUser({
        body: {
          email: `${s.username}@staff.invalid`,
          password: staffPassword,
          name: s.name,
          role: s.role,
          data: { username: s.username, displayUsername: s.username },
        },
      });
      console.log(`[seed] created ${s.role} '${s.username}'`);
    }
  } else {
    console.log("[seed] SEED_STAFF_PASSWORD not set: sample staff skipped");
  }

  await db.$client.end();
}

main().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
