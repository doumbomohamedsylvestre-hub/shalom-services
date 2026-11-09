import { drizzle } from "drizzle-orm/neon-serverless";
import { relations } from "./relations";

// WebSocket Pool driver: supports interactive transactions, which stock and
// money operations depend on (neon-http does not). Node 22+ ships a global
// WebSocket, so no `ws` package is needed.
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

export const db = drizzle({ connection: url, relations });
export type Db = typeof db;
