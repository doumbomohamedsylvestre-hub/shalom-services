/**
 * Boutique figures for the dashboard home: low-stock count and sale revenue.
 * Repair figures join here in the repairs phase.
 */
import { and, count, eq, gte, isNull, lte, sum } from "drizzle-orm";
import { db } from "@/server/db/client";
import { payments, products, sales } from "@/server/db/schema";
import { can, type StaffSession } from "@/server/auth/session";

export type BoutiqueSummary = { lowStock: number; todaySales: number; monthSales: number };

export async function boutiqueSummary(session: StaffSession): Promise<BoutiqueSummary> {
  let lowStock = 0;
  if (can(session, { inventory: ["read"] })) {
    const [row] = await db
      .select({ n: count() })
      .from(products)
      .where(and(eq(products.active, true), lte(products.qtyOnHand, products.minQty)));
    lowStock = row?.n ?? 0;
  }
  if (!can(session, { report: ["read"] })) return { lowStock, todaySales: 0, monthSales: 0 };

  // Money received for non-voided sales (Africa/Bamako = UTC).
  const received = (since: Date) =>
    db
      .select({ total: sum(payments.amount).mapWith(Number) })
      .from(payments)
      .innerJoin(sales, eq(sales.id, payments.saleId))
      .where(and(isNull(payments.voidedAt), isNull(sales.voidedAt), gte(payments.createdAt, since)));
  const startOfDay = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
  const monthAgo = new Date(Date.now() - 30 * 86400_000);
  const [[today], [month]] = await Promise.all([received(startOfDay), received(monthAgo)]);
  return { lowStock, todaySales: today?.total ?? 0, monthSales: month?.total ?? 0 };
}

