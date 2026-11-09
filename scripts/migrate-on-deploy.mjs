// Applies pending Drizzle migrations during a Vercel build, before `next build`.
//
// - Runs only on Vercel (VERCEL=1). Locally, use `npm run db:migrate` explicitly.
// - Production deploys always migrate and fail the build if the database URL is missing.
// - Preview deploys migrate only when MIGRATE_ON_PREVIEW=1. Set it only when previews get
//   their own Neon branch (Neon <> Vercel integration); otherwise a preview of an
//   unmerged branch would migrate the production database.
import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import nextEnv from "@next/env";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";

nextEnv.loadEnvConfig(process.cwd());

const log = (msg) => console.log(`[migrate] ${msg}`);
const env = process.env.VERCEL_ENV; // production | preview | development | undefined

if (process.env.VERCEL !== "1") {
  log("not a Vercel build, skipping (run `npm run db:migrate` locally)");
  process.exit(0);
}
if (env === "preview" && process.env.MIGRATE_ON_PREVIEW !== "1") {
  log("preview build without MIGRATE_ON_PREVIEW=1, skipping");
  process.exit(0);
}

const folder = resolve("drizzle");
if (!existsSync(folder) || readdirSync(folder).length === 0) {
  log("no migrations yet, skipping");
  process.exit(0);
}

// DDL goes through the direct (unpooled) connection.
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  console.error(`[migrate] DATABASE_URL_UNPOOLED / DATABASE_URL is not set for ${env}`);
  process.exit(1);
}

const db = drizzle({ connection: url });
try {
  const result = await migrate(db, { migrationsFolder: folder });
  if (result) {
    console.error("[migrate] migrator refused to run:", result);
    process.exitCode = 1;
  } else {
    log(`migrations applied (${env})`);
  }
} catch (err) {
  console.error("[migrate] failed:", err);
  process.exitCode = 1;
} finally {
  await db.$client.end();
}
