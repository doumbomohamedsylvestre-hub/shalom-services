// Column helpers shared by the schema files (kept apart to avoid import cycles).
import { text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { branches } from "./branches";

export const tstz = (name: string) => timestamp(name, { withTimezone: true });
export const createdAt = () => tstz("created_at").defaultNow().notNull();
export const updatedAt = () =>
  tstz("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull();
/** Staff member who created the row (null for seeded rows). */
export const createdBy = () => text("created_by").references(() => user.id, { onDelete: "set null" });
export const branchId = () =>
  uuid("branch_id")
    .notNull()
    .references(() => branches.id);
export const voidColumns = () => ({
  voidedAt: tstz("voided_at"),
  voidedBy: text("voided_by").references(() => user.id, { onDelete: "set null" }),
  voidReason: text("void_reason"),
});
