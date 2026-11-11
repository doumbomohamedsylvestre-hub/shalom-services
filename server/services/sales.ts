/**
 * Counter sales (SPEC §2.5): products → per-line discounts → payments that
 * cover the total exactly (no credit) → stock goes down. Prices come from the
 * catalogue, never from the client; a lower price is a recorded discount.
 * Only the admin voids, which restocks the items and voids the payments.
 */
import { and, asc, desc, eq, inArray, isNull, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/server/db/client";
import { customers, documentCounters, payments, saleLines, sales, user } from "@/server/db/schema";
import { AppError, notFound } from "@/server/errors";
import { assertCan, type StaffSession } from "@/server/auth/session";
import type { LineItem, Payment, Sale } from "@/shared/domain/types";
import { saleSchema, voidSchema, type SaleInput } from "@/shared/schemas/staff";
import { audit, currentBranchId, orUndef, type Runner, type Tx } from "./_shared";
import { lockProducts, moveStock } from "./inventory";
import { readSettings } from "./settings";

const seller = alias(user, "seller");
const voider = alias(user, "voider");
const receiver = alias(user, "receiver");
const discounter = alias(user, "discounter");

/** Loads complete sales (lines, payments, names) matching `where`, newest first. */
export async function loadSales(runner: Runner, where?: SQL, limit = 300): Promise<Sale[]> {
  const heads = await runner
    .select({
      id: sales.id,
      number: sales.number,
      at: sales.createdAt,
      soldBy: seller.name,
      customerId: customers.id,
      customerName: customers.name,
      customerPhone: customers.phone,
      voidedAt: sales.voidedAt,
      voidedBy: voider.name,
      voidReason: sales.voidReason,
    })
    .from(sales)
    .leftJoin(seller, eq(seller.id, sales.createdBy))
    .leftJoin(voider, eq(voider.id, sales.voidedBy))
    .leftJoin(customers, eq(customers.id, sales.customerId))
    .where(where)
    .orderBy(desc(sales.createdAt))
    .limit(limit);
  if (!heads.length) return [];
  const ids = heads.map((h) => h.id);

  const lines = await runner
    .select({ line: saleLines, discountBy: discounter.name })
    .from(saleLines)
    .leftJoin(discounter, eq(discounter.id, saleLines.discountBy))
    .where(inArray(saleLines.saleId, ids))
    .orderBy(asc(saleLines.sort));
  const pays = await runner
    .select({ p: payments, receivedBy: receiver.name, voidedBy: voider.name })
    .from(payments)
    .leftJoin(receiver, eq(receiver.id, payments.receivedBy))
    .leftJoin(voider, eq(voider.id, payments.voidedBy))
    .where(inArray(payments.saleId, ids))
    .orderBy(asc(payments.createdAt));

  const linesBySale = new Map<string, LineItem[]>();
  for (const { line: l, discountBy } of lines) {
    const list = linesBySale.get(l.saleId) ?? [];
    list.push({
      id: l.id,
      kind: l.kind,
      refId: orUndef(l.productId ?? l.serviceId),
      label: l.label,
      qty: l.qty,
      unitPrice: l.unitPrice,
      discount: l.discount,
      discountBy: l.discount > 0 ? (discountBy ?? undefined) : undefined,
    });
    linesBySale.set(l.saleId, list);
  }
  const paysBySale = new Map<string, Payment[]>();
  for (const { p, receivedBy, voidedBy } of pays) {
    const list = paysBySale.get(p.saleId!) ?? [];
    list.push({
      id: p.id,
      amount: p.amount,
      method: p.method,
      kind: p.kind,
      receivedBy: receivedBy ?? "—",
      at: p.createdAt.toISOString(),
      ...(p.voidedAt && { voided: { at: p.voidedAt.toISOString(), by: voidedBy ?? "—", reason: p.voidReason ?? "" } }),
    });
    paysBySale.set(p.saleId!, list);
  }

  return heads.map((h) => ({
    id: h.id,
    number: h.number,
    customer: h.customerId ? { id: h.customerId, name: h.customerName!, phone: h.customerPhone! } : undefined,
    lines: linesBySale.get(h.id) ?? [],
    payments: paysBySale.get(h.id) ?? [],
    soldBy: h.soldBy ?? "—",
    at: h.at.toISOString(),
    ...(h.voidedAt && { voided: { at: h.voidedAt.toISOString(), by: h.voidedBy ?? "—", reason: h.voidReason ?? "" } }),
  }));
}

export async function listSales(session: StaffSession): Promise<Sale[]> {
  assertCan(session, { sale: ["read"] });
  return loadSales(db);
}

export async function getSale(session: StaffSession, id: string): Promise<Sale> {
  assertCan(session, { sale: ["read"] });
  const [sale] = await loadSales(db, eq(sales.id, id), 1);
  if (!sale) throw notFound("Vente");
  return sale;
}

/** Next gap-free number for a document kind; the row lock serializes concurrent sales. */
async function nextNumber(tx: Tx, branchId: string, kind: string): Promise<number> {
  const [row] = await tx
    .insert(documentCounters)
    .values({ branchId, kind, value: 1 })
    .onConflictDoUpdate({ target: [documentCounters.branchId, documentCounters.kind], set: { value: sql`${documentCounters.value} + 1` } })
    .returning({ value: documentCounters.value });
  return row!.value;
}

export async function createSale(session: StaffSession, input: SaleInput): Promise<Sale> {
  assertCan(session, { sale: ["create"], payment: ["create"] });
  const v = saleSchema.parse(input);
  if (v.lines.some((l) => l.kind !== "product" || !l.refId)) {
    throw new AppError("INVALID_LINE", "Une vente au comptoir ne contient que des articles du stock.", 422);
  }

  const settings = await readSettings();
  const saleId = await db.transaction(async (tx) => {
    const branchId = await currentBranchId(tx);
    if (v.customerId) {
      const [c] = await tx.select({ id: customers.id }).from(customers).where(eq(customers.id, v.customerId)).limit(1);
      if (!c) throw notFound("Client");
    }

    // Merge duplicate product lines, then price them from the catalogue.
    const merged = new Map<string, { qty: number; discount: number }>();
    for (const l of v.lines) {
      const m = merged.get(l.refId!) ?? { qty: 0, discount: 0 };
      merged.set(l.refId!, { qty: m.qty + l.qty, discount: m.discount + l.discount });
    }
    const locked = await lockProducts(tx, [...merged.keys()]);
    const priced = [...merged].map(([productId, m], i) => {
      const p = locked.get(productId);
      if (!p) throw notFound("Produit");
      if (!p.active) throw new AppError("INACTIVE_PRODUCT", `${p.name} n'est plus en vente.`, 409);
      if (p.qtyOnHand < m.qty) throw new AppError("OUT_OF_STOCK", `Stock insuffisant pour ${p.name} (${p.qtyOnHand} disponible${p.qtyOnHand > 1 ? "s" : ""}).`, 409);
      if (m.discount > m.qty * p.salePrice) throw new AppError("DISCOUNT_TOO_HIGH", `La remise sur ${p.name} dépasse le prix.`, 422);
      return { product: p, qty: m.qty, discount: m.discount, sort: i };
    });
    const total = priced.reduce((s, l) => s + l.qty * l.product.salePrice - l.discount, 0);
    const paid = v.payments.reduce((s, p) => s + p.amount, 0);
    if (total <= 0) throw new AppError("ZERO_TOTAL", "Le total de la vente doit être supérieur à 0.", 422);
    if (paid !== total) {
      throw new AppError("PAYMENT_MISMATCH", `Les paiements (${paid} FCFA) doivent égaler le total (${total} FCFA) : pas de crédit.`, 422);
    }

    const n = await nextNumber(tx, branchId, "sale");
    const number = `${settings.prefixes.sale}-${String(n).padStart(5, "0")}`;
    const [sale] = await tx
      .insert(sales)
      .values({ branchId, number, customerId: v.customerId ?? null, total, createdBy: session.user.id })
      .returning({ id: sales.id });

    for (const l of priced) {
      await tx.insert(saleLines).values({
        saleId: sale!.id,
        kind: "product",
        productId: l.product.id,
        label: l.product.name,
        qty: l.qty,
        unitPrice: l.product.salePrice,
        unitCost: l.product.avgCost,
        discount: l.discount,
        discountBy: l.discount > 0 ? session.user.id : null,
        sort: l.sort,
      });
      await moveStock(tx, session, { productId: l.product.id, type: "sale", qtyDelta: -l.qty, unitCost: l.product.avgCost, ref: number, saleId: sale!.id });
    }
    for (const p of v.payments) {
      await tx.insert(payments).values({ branchId, saleId: sale!.id, amount: p.amount, method: p.method, kind: "payment", receivedBy: session.user.id });
    }
    const discounted = priced.filter((l) => l.discount > 0);
    if (discounted.length) {
      await audit(tx, session, {
        action: "discount",
        entity: "Vente",
        entityId: sale!.id,
        entityRef: number,
        summary: `Remise de ${discounted.reduce((s, l) => s + l.discount, 0)} FCFA (${discounted.map((l) => l.product.name).join(", ")}).`,
      });
    }
    return sale!.id;
  });
  return getSale(session, saleId);
}

export async function voidSale(session: StaffSession, id: string, input: { reason: string }): Promise<Sale> {
  assertCan(session, { payment: ["void"] });
  const { reason } = voidSchema.parse(input);
  await db.transaction(async (tx) => {
    const [sale] = await tx.select().from(sales).where(eq(sales.id, id)).for("update").limit(1);
    if (!sale) throw notFound("Vente");
    if (sale.voidedAt) throw new AppError("ALREADY_VOIDED", "Cette vente est déjà annulée.", 409);

    const now = new Date();
    await tx.update(sales).set({ voidedAt: now, voidedBy: session.user.id, voidReason: reason }).where(eq(sales.id, id));
    await tx
      .update(payments)
      .set({ voidedAt: now, voidedBy: session.user.id, voidReason: reason })
      .where(and(eq(payments.saleId, id), isNull(payments.voidedAt)));

    // Reversing movements at the current average cost; history is not recalculated (SPEC risks).
    const lines = await tx.select().from(saleLines).where(and(eq(saleLines.saleId, id), eq(saleLines.kind, "product")));
    const locked = await lockProducts(tx, lines.map((l) => l.productId!).filter(Boolean));
    for (const l of lines) {
      const p = locked.get(l.productId!);
      if (!p) continue;
      await moveStock(tx, session, { productId: p.id, type: "void", qtyDelta: l.qty, unitCost: p.avgCost, ref: sale.number, reason, saleId: id });
    }
    await audit(tx, session, {
      action: "void",
      entity: "Vente",
      entityId: id,
      entityRef: sale.number,
      summary: `Vente de ${sale.total} FCFA annulée : ${reason}`,
      before: { total: sale.total },
    });
  });
  return getSale(session, id);
}
