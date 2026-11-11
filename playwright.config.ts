import { readFileSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end flows (SPEC §6) against a production build served on :3100,
 * wired to the Neon "test" branch from .env.test.local (never dev or main).
 * Run with `npm run test:e2e` (builds into .next-e2e first).
 */
function testEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of readFileSync(".env.test.local", "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]!] = m[2]!;
  }
  return env;
}

const PORT = 3100;

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "fr-FR",
    timezoneId: "UTC",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/connexion`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { ...testEnv(), NEXT_DIST_DIR: ".next-e2e", NODE_OPTIONS: "--dns-result-order=ipv4first", BETTER_AUTH_URL: `http://localhost:${PORT}` },
  },
});
