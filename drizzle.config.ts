import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// Load .env / .env.local the same way Next.js does, so drizzle-kit sees the same variables.
loadEnvConfig(process.cwd());

// drizzle-kit runs DDL, so it uses the direct (unpooled) Neon connection.
// Left empty when unset so offline commands (generate, check) still work;
// push / migrate / studio fail to connect until a URL is provided.
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "";

export default defineConfig({
  dialect: "postgresql",
  schema: "./server/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: { url },
  verbose: true,
});
