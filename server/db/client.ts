import { setDefaultResultOrder } from "node:dns";
import { drizzle } from "drizzle-orm/neon-serverless";
import { relations } from "./relations";

// WebSocket Pool driver: supports interactive transactions, which stock and
// money operations depend on (neon-http does not). Node 22+ ships a global
// WebSocket, so no `ws` package is needed.
// Local machines with broken IPv6 routes fail Neon's WebSocket handshake
// intermittently; prefer IPv4 outside production (Vercel is unaffected).
if (process.env.NODE_ENV !== "production") setDefaultResultOrder("ipv4first");

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

// Fail fast instead of hanging when a connection cannot be opened.
export const db = drizzle({ connection: { connectionString: url, connectionTimeoutMillis: 15_000 }, relations });
export type Db = typeof db;
