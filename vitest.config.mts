import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL("./", import.meta.url));

/**
 * unit: pure rules, no database (always run).
 * integration: service layer against the Neon "test" branch from .env.test.local
 * (skipped when DATABASE_URL is missing); files run one at a time.
 */
export default defineConfig({
  resolve: { alias: { "@": root } },
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    projects: [
      { extends: true, test: { name: "unit", include: ["tests/unit/**/*.test.ts"] } },
      { extends: true, test: { name: "integration", include: ["tests/integration/**/*.test.ts"], fileParallelism: false, testTimeout: 60_000, hookTimeout: 60_000 } },
    ],
  },
});
