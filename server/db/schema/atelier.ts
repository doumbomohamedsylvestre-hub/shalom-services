// Workshop: repair tickets, their lines and status history, public inquiries,
// and the per-IP rate limit for public forms (docs/SPEC.md §2.1–2.4, §2.7–2.8).
// References to shop.ts tables are lazy (arrow functions) to keep the import
// cycle with payments.repair_id harmless.
import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { branchId, createdAt, createdBy, tstz, updatedAt } from "./_columns";
import { customers, products, services } from "./shop";

export const REPAIR_STATUS_VALUES = [
  "received",
  "diagnosing",
  "quote_sent",
  "approved",
  "refused",
  "in_repair",
  "waiting_parts",
  "ready",
  "picked_up",
  "unrepairable",
  "returned_unrepaired",
  "cancelled",
] as const;
type RepairStatusValue = (typeof REPAIR_STATUS_VALUES)[number];
const statusList = sql.raw(REPAIR_STATUS_VALUES.map((s) => `'${s}'`).join(", "));

export const repairs = pgTable(
  "repairs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: branchId(),
    /** Public tracking code, random and non-sequential (SPEC ASSUMPTION 11), e.g. SS-7K3M9Q. */
    code: text("code").notNull().unique(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    brand: text("brand").notNull(),
    model: text("model").notNull(),
    color: text("color"),
    /** Free text, identification only (SPEC ASSUMPTION 1). The passcode is never stored. */
    imei: text("imei"),
    fault: text("fault").notNull(),
    conditionNotes: text("condition_notes"),
    accessories: text("accessories"),
    diagnosis: text("diagnosis"),
    mode: text("mode").$type<"fixed" | "quote">().notNull(),
    status: text("status").$type<RepairStatusValue>().notNull().default("received"),
    /** Null = in the unclaimed queue. */
    technicianId: text("technician_id").references(() => user.id, { onDelete: "set null" }),
    estimatedReadyAt: tstz("estimated_ready_at"),
    /** Sequential invoice number, assigned at pickup. */
    invoiceNumber: text("invoice_number").unique(),
    pickedUpAt: tstz("picked_up_at"),
    createdAt: createdAt(),
    createdBy: createdBy(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("repairs_mode", sql`${t.mode} in ('fixed', 'quote')`),
    check("repairs_status", sql`${t.status} in (${statusList})`),
    index("repairs_status_idx").on(t.status),
    index("repairs_customer_idx").on(t.customerId),
    index("repairs_technician_idx").on(t.technicianId),
    index("repairs_updated_at_idx").on(t.updatedAt),
  ],
);

/** Same shape as sale lines. Removed lines are kept (removed_at) for the audit trail. */
export const repairLines = pgTable(
  "repair_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    repairId: uuid("repair_id")
      .notNull()
      .references(() => repairs.id),
    kind: text("kind").$type<"service" | "product">().notNull(),
    productId: uuid("product_id").references(() => products.id),
    serviceId: uuid("service_id").references(() => services.id),
    label: text("label").notNull(),
    qty: integer("qty").notNull(),
    unitPrice: integer("unit_price").notNull(),
    /** Average cost frozen when the part was used (SPEC §2.2). */
    unitCost: integer("unit_cost").notNull().default(0),
    discount: integer("discount").notNull().default(0),
    discountBy: text("discount_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    createdBy: createdBy(),
    removedAt: tstz("removed_at"),
    removedBy: text("removed_by").references(() => user.id, { onDelete: "set null" }),
  },
  (t) => [
    check("repair_lines_kind", sql`${t.kind} in ('service', 'product')`),
    check("repair_lines_amounts", sql`${t.qty} > 0 and ${t.unitPrice} >= 0 and ${t.discount} >= 0 and ${t.discount} <= ${t.qty} * ${t.unitPrice}`),
    index("repair_lines_repair_idx").on(t.repairId),
  ],
);

export const repairStatusEvents = pgTable(
  "repair_status_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    repairId: uuid("repair_id")
      .notNull()
      .references(() => repairs.id),
    fromStatus: text("from_status").$type<RepairStatusValue>(),
    toStatus: text("to_status").$type<RepairStatusValue>().notNull(),
    note: text("note"),
    at: tstz("at").defaultNow().notNull(),
    by: text("by").references(() => user.id, { onDelete: "set null" }),
  },
  (t) => [index("repair_status_events_repair_idx").on(t.repairId, t.at)],
);

export const inquiries = pgTable(
  "inquiries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: text("type").$type<"repair" | "quote" | "contact">().notNull(),
    name: text("name").notNull(),
    /** Normalized +223 when valid, raw otherwise. */
    phone: text("phone").notNull(),
    device: text("device"),
    message: text("message").notNull(),
    status: text("status").$type<"new" | "contacted" | "converted" | "closed">().notNull().default("new"),
    convertedRepairId: uuid("converted_repair_id").references(() => repairs.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
  },
  (t) => [
    check("inquiries_type", sql`${t.type} in ('repair', 'quote', 'contact')`),
    check("inquiries_status", sql`${t.status} in ('new', 'contacted', 'converted', 'closed')`),
    index("inquiries_created_at_idx").on(t.createdAt),
  ],
);

/** Fixed-window counters for public forms and tracking lookups (SPEC ASSUMPTION 4). */
export const publicRateLimits = pgTable("public_rate_limits", {
  key: text("key").primaryKey(),
  windowStart: tstz("window_start").notNull(),
  count: integer("count").notNull(),
});
