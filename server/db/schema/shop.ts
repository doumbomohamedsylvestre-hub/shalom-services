// Shop configuration, back-office records and the audit log (docs/SPEC.md §3).
// Money is integer XOF. Every table has created_at / created_by; records tied
// to a physical shop carry branch_id. Money and stock rows are never deleted:
// they are voided with a reason (voided_at / voided_by / void_reason).
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { branchId, createdAt, createdBy, tstz, updatedAt, voidColumns } from "./_columns";
import { repairs } from "./atelier";

export type OpeningHours = { days: string; open: string; close: string }[];

/** Single row (id = 1): everything the owner edits in Paramètres. */
export const shopSettings = pgTable(
  "shop_settings",
  {
    id: integer("id").primaryKey().default(1),
    name: text("name").notNull(),
    address: text("address").notNull(),
    city: text("city").notNull(),
    /** Normalized +223 numbers, first one is the main line. */
    phones: jsonb("phones").$type<string[]>().notNull(),
    whatsapp: text("whatsapp").notNull(),
    email: text("email"),
    mapUrl: text("map_url"),
    mapEmbedUrl: text("map_embed_url"),
    hours: jsonb("hours").$type<OpeningHours>().notNull(),
    terms: text("terms").notNull().default(""),
    /** Percent, 0 in v1 (SPEC ASSUMPTION 9). */
    taxRate: integer("tax_rate").notNull().default(0),
    salePrefix: text("sale_prefix").notNull().default("V"),
    invoicePrefix: text("invoice_prefix").notNull().default("F"),
    waQuoteReady: text("wa_quote_ready").notNull(),
    waRepairReady: text("wa_repair_ready").notNull(),
    updatedAt: updatedAt(),
    updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
  },
  (t) => [check("shop_settings_single_row", sql`${t.id} = 1`)],
);

export const services = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  summary: text("summary").notNull(),
  description: text("description").notNull().default(""),
  /** Null = "sur devis". */
  priceFrom: integer("price_from"),
  durationLabel: text("duration_label").notNull().default(""),
  /** Public path or storage key of the card image. */
  image: text("image").notNull(),
  isPublic: boolean("is_public").notNull().default(true),
  active: boolean("active").notNull().default(true),
  sort: integer("sort").notNull().default(0),
  createdAt: createdAt(),
  createdBy: createdBy(),
  updatedAt: updatedAt(),
});

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    /** Normalized +223XXXXXXXX, one customer per number (SPEC ASSUMPTION 8). */
    phone: text("phone").notNull().unique(),
    altPhone: text("alt_phone"),
    notes: text("notes"),
    createdAt: createdAt(),
    createdBy: createdBy(),
    updatedAt: updatedAt(),
  },
  (t) => [index("customers_name_idx").on(t.name)],
);

export const productCategories = pgTable("product_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  createdAt: createdAt(),
  createdBy: createdBy(),
});

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: branchId(),
    sku: text("sku").notNull().unique(),
    name: text("name").notNull(),
    kind: text("kind").$type<"part" | "accessory" | "phone">().notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => productCategories.id),
    salePrice: integer("sale_price").notNull(),
    /** Weighted average cost, recalculated on every stock receipt. */
    avgCost: integer("avg_cost").notNull().default(0),
    qtyOnHand: integer("qty_on_hand").notNull().default(0),
    minQty: integer("min_qty").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
    createdBy: createdBy(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("products_qty_non_negative", sql`${t.qtyOnHand} >= 0`),
    check("products_kind", sql`${t.kind} in ('part', 'accessory', 'phone')`),
    check("products_money_non_negative", sql`${t.salePrice} >= 0 and ${t.avgCost} >= 0 and ${t.minQty} >= 0`),
    index("products_category_idx").on(t.categoryId),
  ],
);

export const suppliers = pgTable("suppliers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  phone: text("phone"),
  contact: text("contact"),
  notes: text("notes"),
  createdAt: createdAt(),
  createdBy: createdBy(),
  updatedAt: updatedAt(),
});

export const stockReceipts = pgTable(
  "stock_receipts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: branchId(),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id),
    /** Sum of qty × unit_cost over the lines. */
    totalCost: integer("total_cost").notNull(),
    /** Informational only: supplier debt is out of scope (SPEC §1). */
    amountPaid: integer("amount_paid").notNull().default(0),
    note: text("note"),
    createdAt: createdAt(),
    createdBy: createdBy(),
    ...voidColumns(),
  },
  (t) => [index("stock_receipts_supplier_idx").on(t.supplierId), index("stock_receipts_created_at_idx").on(t.createdAt)],
);

export const stockReceiptLines = pgTable(
  "stock_receipt_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    receiptId: uuid("receipt_id")
      .notNull()
      .references(() => stockReceipts.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    qty: integer("qty").notNull(),
    unitCost: integer("unit_cost").notNull(),
  },
  (t) => [check("stock_receipt_lines_positive", sql`${t.qty} > 0 and ${t.unitCost} >= 0`)],
);

export const sales = pgTable(
  "sales",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: branchId(),
    /** Sequential, gap-free: prefix + document_counters value (SPEC ASSUMPTION 11). */
    number: text("number").notNull().unique(),
    customerId: uuid("customer_id").references(() => customers.id),
    total: integer("total").notNull(),
    createdAt: createdAt(),
    createdBy: createdBy(),
    ...voidColumns(),
  },
  (t) => [index("sales_created_at_idx").on(t.createdAt), index("sales_customer_idx").on(t.customerId)],
);

/** Same line shape as repair lines: price, frozen unit cost, discount and who gave it. */
export const saleLines = pgTable(
  "sale_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    saleId: uuid("sale_id")
      .notNull()
      .references(() => sales.id),
    kind: text("kind").$type<"service" | "product">().notNull(),
    productId: uuid("product_id").references(() => products.id),
    serviceId: uuid("service_id").references(() => services.id),
    label: text("label").notNull(),
    qty: integer("qty").notNull(),
    unitPrice: integer("unit_price").notNull(),
    /** Average cost at the time of sale, for profit reports. */
    unitCost: integer("unit_cost").notNull().default(0),
    discount: integer("discount").notNull().default(0),
    discountBy: text("discount_by").references(() => user.id, { onDelete: "set null" }),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [
    check("sale_lines_amounts", sql`${t.qty} > 0 and ${t.unitPrice} >= 0 and ${t.discount} >= 0 and ${t.discount} <= ${t.qty} * ${t.unitPrice}`),
    index("sale_lines_sale_idx").on(t.saleId),
  ],
);

/** A payment belongs to exactly one sale or one repair. */
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: branchId(),
    saleId: uuid("sale_id").references(() => sales.id),
    repairId: uuid("repair_id").references(() => repairs.id),
    amount: integer("amount").notNull(),
    method: text("method").$type<"cash" | "orange_money" | "moov_money" | "bank">().notNull(),
    kind: text("kind").$type<"deposit" | "payment">().notNull(),
    receivedBy: text("received_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    ...voidColumns(),
  },
  (t) => [
    check("payments_amount_positive", sql`${t.amount} > 0`),
    check("payments_method", sql`${t.method} in ('cash', 'orange_money', 'moov_money', 'bank')`),
    check("payments_one_owner", sql`(${t.saleId} is null) <> (${t.repairId} is null)`),
    index("payments_sale_idx").on(t.saleId),
    index("payments_repair_idx").on(t.repairId),
    index("payments_created_at_idx").on(t.createdAt),
  ],
);

/** Stock ledger. products.qty_on_hand is updated in the same transaction. */
export const stockMovements = pgTable(
  "stock_movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: branchId(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    type: text("type").$type<"receipt" | "sale" | "repair_use" | "adjustment" | "void">().notNull(),
    qtyDelta: integer("qty_delta").notNull(),
    unitCost: integer("unit_cost").notNull(),
    /** Human reference shown in the ledger (sale number, supplier…). */
    ref: text("ref"),
    reason: text("reason"),
    receiptId: uuid("receipt_id").references(() => stockReceipts.id),
    saleId: uuid("sale_id").references(() => sales.id),
    repairId: uuid("repair_id").references(() => repairs.id),
    createdAt: createdAt(),
    createdBy: createdBy(),
  },
  (t) => [
    check("stock_movements_type", sql`${t.type} in ('receipt', 'sale', 'repair_use', 'adjustment', 'void')`),
    check("stock_movements_non_zero", sql`${t.qtyDelta} <> 0`),
    index("stock_movements_product_idx").on(t.productId),
    index("stock_movements_created_at_idx").on(t.createdAt),
  ],
);

export const expenseCategories = pgTable("expense_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  createdAt: createdAt(),
  createdBy: createdBy(),
});

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: branchId(),
    /** Day the expense was paid (Africa/Bamako = UTC). */
    date: date("date", { mode: "string" }).notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => expenseCategories.id),
    amount: integer("amount").notNull(),
    method: text("method").$type<"cash" | "orange_money" | "moov_money" | "bank">().notNull(),
    note: text("note"),
    createdAt: createdAt(),
    createdBy: createdBy(),
    ...voidColumns(),
  },
  (t) => [
    check("expenses_amount_positive", sql`${t.amount} > 0`),
    check("expenses_method", sql`${t.method} in ('cash', 'orange_money', 'moov_money', 'bank')`),
    index("expenses_date_idx").on(t.date),
  ],
);

/** Gap-free document numbers per branch (incremented inside the transaction). */
export const documentCounters = pgTable(
  "document_counters",
  {
    branchId: branchId(),
    kind: text("kind").notNull(),
    value: integer("value").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.branchId, t.kind] })],
);

/** Who did what: money, stock, settings and staff changes (SPEC §1). */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: text("actor_id").references(() => user.id, { onDelete: "set null" }),
    /** Copied so the log stays readable if the account is renamed. */
    actorName: text("actor_name").notNull(),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    /** Human reference: sale number, SKU, username… */
    entityRef: text("entity_ref").notNull().default(""),
    summary: text("summary").notNull(),
    before: jsonb("before"),
    after: jsonb("after"),
    at: tstz("at").defaultNow().notNull(),
  },
  (t) => [index("audit_log_at_idx").on(t.at), index("audit_log_entity_idx").on(t.entity, t.entityId)],
);
