/**
 * Stock (SPEC §2.6, §3): products tracked by quantity, weighted average cost
 * recalculated on each receipt, a movement ledger written in the same
 * transaction as qty_on_hand, and stock that never goes below zero.
 */
import { and, asc, count, desc, eq, inArray, isNull, max, ne, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import {
  productCategories,
  products as productsTable,
  stockMovements,
  stockReceiptLines,
  stockReceipts,
  suppliers as suppliersTable,
  user,
} from "@/server/db/schema";
import { AppError, notFound } from "@/server/errors";
import { assertCan, can, type StaffSession } from "@/server/auth/session";
import type { Product, StockMovement, StockMovementType, StockReceipt, Supplier } from "@/shared/domain/types";
import {
  productSchema,
  stockAdjustmentSchema,
  stockReceiptSchema,
  supplierSchema,
  type ProductInput,
  type StockAdjustmentInput,
  type StockReceiptInput,
  type SupplierInput,
  voidSchema,
} from "@/shared/schemas/staff";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";
import { weightedAverageCost } from "@/shared/domain/stock";
import { audit, currentBranchId, isUniqueViolation, orUndef, type Tx } from "./_shared";

// ───────────────────────────── Products & categories ─────────────────────────────

const productColumns = {
  id: productsTable.id,
  sku: productsTable.sku,
  name: productsTable.name,
  kind: productsTable.kind,
  category: productCategories.name,
  salePrice: productsTable.salePrice,
  avgCost: productsTable.avgCost,
  qtyOnHand: productsTable.qtyOnHand,
  minQty: productsTable.minQty,
  active: productsTable.active,
};

/** Average cost is a finance figure: hidden from roles without report access. */
function forRole(session: StaffSession, p: Product): Product {
  return can(session, { report: ["read"] }) ? p : { ...p, avgCost: 0 };
}

export async function listProducts(session: StaffSession): Promise<Product[]> {
  assertCan(session, { inventory: ["read"] });
  const rows = await db
    .select(productColumns)
    .from(productsTable)
    .innerJoin(productCategories, eq(productCategories.id, productsTable.categoryId))
    .orderBy(asc(productCategories.name), asc(productsTable.name));
  return rows.map((p) => forRole(session, p));
}

async function getProduct(runner: typeof db | Tx, id: string): Promise<Product> {
  const [row] = await runner
    .select(productColumns)
    .from(productsTable)
    .innerJoin(productCategories, eq(productCategories.id, productsTable.categoryId))
    .where(eq(productsTable.id, id))
    .limit(1);
  if (!row) throw notFound("Produit");
  return row;
}

export async function listProductCategories(session: StaffSession): Promise<string[]> {
  assertCan(session, { inventory: ["read"] });
  const rows = await db.select({ name: productCategories.name }).from(productCategories).orderBy(asc(productCategories.name));
  return rows.map((r) => r.name);
}

const categoryNameSchema = z.object({ name: z.string().trim().min(1, "Le nom est requis.").max(60, "Nom trop long.") });

export async function createProductCategory(session: StaffSession, input: { name: string }): Promise<string> {
  assertCan(session, { settings: ["update"] });
  const { name } = categoryNameSchema.parse(input);
  try {
    await db.transaction(async (tx) => {
      await tx.insert(productCategories).values({ name, createdBy: session.user.id });
      await audit(tx, session, { action: "create", entity: "Catégorie de produits", entityRef: name, summary: "Catégorie ajoutée." });
    });
  } catch (err) {
    if (isUniqueViolation(err)) throw new AppError("DUPLICATE_CATEGORY", "Cette catégorie existe déjà.", 409);
    throw err;
  }
  return name;
}

async function categoryIdByName(tx: Tx, name: string) {
  const [row] = await tx.select({ id: productCategories.id }).from(productCategories).where(eq(productCategories.name, name)).limit(1);
  if (!row) throw new AppError("UNKNOWN_CATEGORY", "Choisissez une catégorie existante.", 422);
  return row.id;
}

export async function saveProduct(session: StaffSession, input: ProductInput, id?: string): Promise<Product> {
  assertCan(session, { inventory: ["adjust"] });
  const v = productSchema.parse(input);
  const sku = v.sku.toUpperCase();
  const [dup] = await db
    .select({ id: productsTable.id })
    .from(productsTable)
    .where(and(eq(productsTable.sku, sku), id ? ne(productsTable.id, id) : undefined))
    .limit(1);
  if (dup) throw new AppError("DUPLICATE_SKU", "Cette référence existe déjà.", 409);

  try {
    const savedId = await db.transaction(async (tx) => {
      const categoryId = await categoryIdByName(tx, v.category);
      const fields = { sku, name: v.name, kind: v.kind, categoryId, salePrice: v.salePrice, minQty: v.minQty, active: v.active };
      if (id) {
        const before = await getProduct(tx, id);
        await tx.update(productsTable).set(fields).where(eq(productsTable.id, id));
        if (before.active !== v.active) {
          await audit(tx, session, {
            action: "update",
            entity: "Produit",
            entityId: id,
            entityRef: sku,
            summary: v.active ? "Produit remis en vente." : "Produit retiré de la vente.",
          });
        }
        if (before.salePrice !== v.salePrice) {
          await audit(tx, session, {
            action: "update",
            entity: "Produit",
            entityId: id,
            entityRef: sku,
            summary: `Prix de vente modifié : ${before.salePrice} → ${v.salePrice} FCFA.`,
            before: { salePrice: before.salePrice },
            after: { salePrice: v.salePrice },
          });
        }
        return id;
      }
      const [row] = await tx
        .insert(productsTable)
        .values({ ...fields, branchId: await currentBranchId(tx), createdBy: session.user.id })
        .returning({ id: productsTable.id });
      await audit(tx, session, { action: "create", entity: "Produit", entityId: row!.id, entityRef: sku, summary: `Produit « ${v.name} » ajouté.` });
      return row!.id;
    });
    return forRole(session, await getProduct(db, savedId));
  } catch (err) {
    if (isUniqueViolation(err)) throw new AppError("DUPLICATE_SKU", "Cette référence existe déjà.", 409);
    throw err;
  }
}

// ───────────────────────────── Stock changes ─────────────────────────────

/** Locks the product rows (SELECT … FOR UPDATE) so concurrent sales cannot oversell. */
export async function lockProducts(tx: Tx, ids: string[]) {
  if (!ids.length) return new Map<string, typeof productsTable.$inferSelect>();
  const rows = await tx.select().from(productsTable).where(inArray(productsTable.id, [...new Set(ids)])).for("update");
  return new Map(rows.map((r) => [r.id, r]));
}

type MovementInput = {
  productId: string;
  type: StockMovementType;
  qtyDelta: number;
  unitCost: number;
  ref?: string;
  reason?: string;
  receiptId?: string;
  saleId?: string;
  repairId?: string;
  /** New weighted average cost, when the movement changes it (receipts). */
  newAvgCost?: number;
};

/** Applies one movement: ledger row + qty_on_hand in the same transaction. Rows must be locked first. */
export async function moveStock(tx: Tx, session: StaffSession, m: MovementInput) {
  const [updated] = await tx
    .update(productsTable)
    .set({
      qtyOnHand: sql`${productsTable.qtyOnHand} + ${m.qtyDelta}`,
      ...(m.newAvgCost !== undefined && { avgCost: m.newAvgCost }),
    })
    .where(and(eq(productsTable.id, m.productId), sql`${productsTable.qtyOnHand} + ${m.qtyDelta} >= 0`))
    .returning({ qty: productsTable.qtyOnHand, name: productsTable.name });
  if (!updated) {
    const [p] = await tx.select({ name: productsTable.name, qty: productsTable.qtyOnHand }).from(productsTable).where(eq(productsTable.id, m.productId));
    if (!p) throw notFound("Produit");
    throw new AppError("OUT_OF_STOCK", `Stock insuffisant pour ${p.name} (${p.qty} disponible${p.qty > 1 ? "s" : ""}).`, 409);
  }
  await tx.insert(stockMovements).values({
    branchId: await currentBranchId(tx),
    productId: m.productId,
    type: m.type,
    qtyDelta: m.qtyDelta,
    unitCost: m.unitCost,
    ref: m.ref,
    reason: m.reason,
    receiptId: m.receiptId,
    saleId: m.saleId,
    repairId: m.repairId,
    createdBy: session.user.id,
  });
}


export async function adjustStock(session: StaffSession, input: StockAdjustmentInput): Promise<Product> {
  assertCan(session, { inventory: ["adjust"] });
  const v = stockAdjustmentSchema.parse(input);
  await db.transaction(async (tx) => {
    const locked = await lockProducts(tx, [v.productId]);
    const p = locked.get(v.productId);
    if (!p) throw notFound("Produit");
    if (p.qtyOnHand + v.qtyDelta < 0) throw new AppError("NEGATIVE_STOCK", `Le stock ne peut pas devenir négatif (actuellement ${p.qtyOnHand}).`, 409);
    // Adjustments move units at the current average cost and do not change it.
    await moveStock(tx, session, { productId: p.id, type: "adjustment", qtyDelta: v.qtyDelta, unitCost: p.avgCost, reason: v.reason });
    await audit(tx, session, {
      action: "adjust",
      entity: "Stock",
      entityId: p.id,
      entityRef: p.sku,
      summary: `Ajustement ${v.qtyDelta > 0 ? "+" : ""}${v.qtyDelta} (${p.qtyOnHand} → ${p.qtyOnHand + v.qtyDelta}) : ${v.reason}`,
      before: { qtyOnHand: p.qtyOnHand },
      after: { qtyOnHand: p.qtyOnHand + v.qtyDelta },
    });
  });
  return forRole(session, await getProduct(db, v.productId));
}

export async function receiveStock(session: StaffSession, input: StockReceiptInput): Promise<void> {
  assertCan(session, { inventory: ["receive"] });
  const v = stockReceiptSchema.parse(input);
  await db.transaction(async (tx) => {
    const [supplier] = await tx.select({ id: suppliersTable.id, name: suppliersTable.name }).from(suppliersTable).where(eq(suppliersTable.id, v.supplierId)).limit(1);
    if (!supplier) throw notFound("Fournisseur");
    const locked = await lockProducts(tx, v.lines.map((l) => l.productId));
    for (const l of v.lines) {
      const p = locked.get(l.productId);
      if (!p) throw notFound("Produit");
      if (!p.active) throw new AppError("INACTIVE_PRODUCT", `${p.name} est retiré de la vente : réactivez-le avant de le réceptionner.`, 409);
    }

    const totalCost = v.lines.reduce((s, l) => s + l.qty * l.unitCost, 0);
    const [receipt] = await tx
      .insert(stockReceipts)
      .values({
        branchId: await currentBranchId(tx),
        supplierId: supplier.id,
        totalCost,
        amountPaid: v.amountPaid,
        note: v.note || null,
        createdBy: session.user.id,
      })
      .returning({ id: stockReceipts.id });

    // Lines are applied in order, so two lines for the same product both count.
    const state = new Map([...locked].map(([id, p]) => [id, { qty: p.qtyOnHand, avg: p.avgCost }]));
    for (const l of v.lines) {
      const s = state.get(l.productId)!;
      const newAvg = weightedAverageCost(s.qty, s.avg, l.qty, l.unitCost);
      await tx.insert(stockReceiptLines).values({ receiptId: receipt!.id, productId: l.productId, qty: l.qty, unitCost: l.unitCost });
      await moveStock(tx, session, {
        productId: l.productId,
        type: "receipt",
        qtyDelta: l.qty,
        unitCost: l.unitCost,
        ref: `Réception ${supplier.name}`,
        receiptId: receipt!.id,
        newAvgCost: newAvg,
      });
      state.set(l.productId, { qty: s.qty + l.qty, avg: newAvg });
    }
    const units = v.lines.reduce((s, l) => s + l.qty, 0);
    await audit(tx, session, {
      action: "receive",
      entity: "Réception",
      entityId: receipt!.id,
      entityRef: supplier.name,
      summary: `${units} article${units > 1 ? "s" : ""} reçu${units > 1 ? "s" : ""}, valeur ${totalCost} FCFA, payé ${v.amountPaid} FCFA.`,
      after: { lines: v.lines, amountPaid: v.amountPaid, note: v.note },
    });
  });
}

export async function listMovements(session: StaffSession, productId?: string): Promise<StockMovement[]> {
  assertCan(session, { inventory: ["read"] });
  const rows = await db
    .select({
      id: stockMovements.id,
      productId: stockMovements.productId,
      productName: productsTable.name,
      type: stockMovements.type,
      qtyDelta: stockMovements.qtyDelta,
      unitCost: stockMovements.unitCost,
      ref: stockMovements.ref,
      reason: stockMovements.reason,
      by: user.name,
      at: stockMovements.createdAt,
    })
    .from(stockMovements)
    .innerJoin(productsTable, eq(productsTable.id, stockMovements.productId))
    .leftJoin(user, eq(user.id, stockMovements.createdBy))
    .where(productId ? eq(stockMovements.productId, productId) : undefined)
    .orderBy(desc(stockMovements.createdAt))
    .limit(300);
  const admin = can(session, { report: ["read"] });
  return rows.map((m) => ({
    id: m.id,
    productId: m.productId,
    productName: m.productName,
    type: m.type,
    qtyDelta: m.qtyDelta,
    unitCost: admin ? m.unitCost : 0,
    ref: orUndef(m.ref),
    reason: orUndef(m.reason),
    by: m.by ?? "—",
    at: m.at.toISOString(),
  }));
}

// ───────────────────────────── Receipts ─────────────────────────────

const receiver = alias(user, "receiver");
const receiptVoider = alias(user, "receipt_voider");

export async function listReceipts(session: StaffSession): Promise<StockReceipt[]> {
  assertCan(session, { inventory: ["receive"] });
  const heads = await db
    .select({ r: stockReceipts, supplierName: suppliersTable.name, by: receiver.name, voidedBy: receiptVoider.name })
    .from(stockReceipts)
    .innerJoin(suppliersTable, eq(suppliersTable.id, stockReceipts.supplierId))
    .leftJoin(receiver, eq(receiver.id, stockReceipts.createdBy))
    .leftJoin(receiptVoider, eq(receiptVoider.id, stockReceipts.voidedBy))
    .orderBy(desc(stockReceipts.createdAt))
    .limit(200);
  if (!heads.length) return [];
  const lines = await db
    .select({ receiptId: stockReceiptLines.receiptId, productId: stockReceiptLines.productId, productName: productsTable.name, qty: stockReceiptLines.qty, unitCost: stockReceiptLines.unitCost })
    .from(stockReceiptLines)
    .innerJoin(productsTable, eq(productsTable.id, stockReceiptLines.productId))
    .where(inArray(stockReceiptLines.receiptId, heads.map((h) => h.r.id)));
  // Whoever can receive stock entered these costs, so they may see them.
  return heads.map(({ r, supplierName, by, voidedBy }) => ({
    id: r.id,
    supplier: { id: r.supplierId, name: supplierName },
    lines: lines
      .filter((l) => l.receiptId === r.id)
      .map((l) => ({ productId: l.productId, productName: l.productName, qty: l.qty, unitCost: l.unitCost })),
    totalCost: r.totalCost,
    amountPaid: r.amountPaid,
    note: orUndef(r.note),
    by: by ?? "—",
    at: r.createdAt.toISOString(),
    ...(r.voidedAt && { voided: { at: r.voidedAt.toISOString(), by: voidedBy ?? "—", reason: r.voidReason ?? "" } }),
  }));
}

/**
 * Admin only. Takes the received units back out at the current average cost,
 * without recalculating history (SPEC risks). Refused if some of them were
 * already sold or used: stock never goes below zero.
 */
export async function voidReceipt(session: StaffSession, id: string, input: { reason: string }): Promise<StockReceipt> {
  assertCan(session, { inventory: ["adjust"] });
  const { reason } = voidSchema.parse(input);
  if (!z.uuid().safeParse(id).success) throw notFound("Réception");
  await db.transaction(async (tx) => {
    const [r] = await tx.select().from(stockReceipts).where(eq(stockReceipts.id, id)).for("update").limit(1);
    if (!r) throw notFound("Réception");
    if (r.voidedAt) throw new AppError("ALREADY_VOIDED", "Cette réception est déjà annulée.", 409);
    const lines = await tx.select().from(stockReceiptLines).where(eq(stockReceiptLines.receiptId, id));
    const locked = await lockProducts(tx, lines.map((l) => l.productId));
    const need = new Map<string, number>();
    for (const l of lines) need.set(l.productId, (need.get(l.productId) ?? 0) + l.qty);
    for (const [productId, qty] of need) {
      const p = locked.get(productId)!;
      if (p.qtyOnHand < qty) {
        throw new AppError("STOCK_ALREADY_USED", `Impossible : ${p.name} n'a plus que ${p.qtyOnHand} en stock sur ${qty} reçus. Faites plutôt un ajustement.`, 409);
      }
    }
    for (const [productId, qty] of need) {
      const p = locked.get(productId)!;
      await moveStock(tx, session, { productId, type: "void", qtyDelta: -qty, unitCost: p.avgCost, ref: "Réception annulée", reason, receiptId: id });
    }
    await tx.update(stockReceipts).set({ voidedAt: new Date(), voidedBy: session.user.id, voidReason: reason }).where(eq(stockReceipts.id, id));
    await audit(tx, session, { action: "void", entity: "Réception", entityId: id, entityRef: r.totalCost.toString(), summary: `Réception de ${r.totalCost} FCFA annulée : ${reason}` });
  });
  const saved = (await listReceipts(session)).find((x) => x.id === id);
  if (!saved) throw notFound("Réception");
  return saved;
}

// ───────────────────────────── Suppliers ─────────────────────────────

export async function listSuppliers(session: StaffSession): Promise<Supplier[]> {
  assertCan(session, { supplier: ["read"] });
  const stats = db
    .select({ supplierId: stockReceipts.supplierId, n: count().as("n"), last: max(stockReceipts.createdAt).as("last") })
    .from(stockReceipts)
    .where(isNull(stockReceipts.voidedAt))
    .groupBy(stockReceipts.supplierId)
    .as("stats");
  const rows = await db
    .select({ s: suppliersTable, n: stats.n, last: stats.last })
    .from(suppliersTable)
    .leftJoin(stats, eq(stats.supplierId, suppliersTable.id))
    .orderBy(asc(suppliersTable.name));
  return rows.map(({ s, n, last }) => ({
    id: s.id,
    name: s.name,
    phone: orUndef(s.phone),
    contact: orUndef(s.contact),
    notes: orUndef(s.notes),
    receiptsCount: Number(n ?? 0),
    lastReceiptAt: last ? new Date(last).toISOString() : undefined,
  }));
}

export async function saveSupplier(session: StaffSession, input: SupplierInput, id?: string): Promise<Supplier> {
  assertCan(session, { supplier: ["manage"] });
  const v = supplierSchema.parse(input);
  const fields = { name: v.name, phone: v.phone || null, contact: v.contact || null, notes: v.notes || null };
  let savedId = id;
  if (id) {
    const [row] = await db.update(suppliersTable).set(fields).where(eq(suppliersTable.id, id)).returning({ id: suppliersTable.id });
    if (!row) throw notFound("Fournisseur");
  } else {
    const [row] = await db.insert(suppliersTable).values({ ...fields, createdBy: session.user.id }).returning({ id: suppliersTable.id });
    savedId = row!.id;
  }
  const saved = (await listSuppliers(session)).find((s) => s.id === savedId);
  if (!saved) throw notFound("Fournisseur");
  return saved;
}
