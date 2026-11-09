import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// v1 runs a single shop, but every location-bound record points at a branch
// so a second shop never needs a data migration (see docs/SPEC.md §3).
export const branches = pgTable("branches", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
