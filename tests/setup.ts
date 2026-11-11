// Vitest runs with NODE_ENV=test, so @next/env loads .env.test.local (Neon "test"
// branch) and never .env.local (dev).
import { setDefaultResultOrder } from "node:dns";
import { loadEnvConfig } from "@next/env";
import { vi } from "vitest";

loadEnvConfig(process.cwd());
setDefaultResultOrder("ipv4first");

// Outside a Next.js request there is no cache to revalidate.
vi.mock("next/cache", () => ({ revalidateTag: () => {}, cacheTag: () => {}, cacheLife: () => {} }));
