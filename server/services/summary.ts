/**
 * Dashboard home figures (repairs, revenue, stock, inbox). Each figure is
 * only computed for roles allowed to see it; the rest come back as 0.
 */
import { and, count, eq, gte, inArray, isNull, lt, lte, ne, or, sum } from "drizzle-orm";
import { db } from "@/server/db/client";
import { inquiries, payments, products, repairs, sales } from "@/server/db/schema";
import { can, type StaffSession } from "@/server/auth/session";
import { OPEN_STATUSES } from "@/shared/domain/labels";
import type { DashboardSummary } from "@/shared/domain/types";

export async function dashboardSummary(session: StaffSession): Promise<DashboardSummary> {
  const out: DashboardSummary = { openRepairs: 0, readyForPickup: 0, overdue: 0, unclaimed: 0, todayRevenue: 0, monthRevenue: 0, lowStock: 0, newInquiries: 0 };
  const tasks: Promise<void>[] = [];

  if (can(session, { repair: ["read"] })) {
    // Technicians: counts over the queue and their own tickets.
    const scope = session.user.role === "technician" ? or(isNull(repairs.technicianId), eq(repairs.technicianId, session.user.id)) : undefined;
    const open = and(inArray(repairs.status, OPEN_STATUSES), scope);
    const n = async (where: ReturnType<typeof and>) => (await db.select({ n: count() }).from(repairs).where(where))[0]?.n ?? 0;
    tasks.push(
      (async () => {
        [out.openRepairs, out.readyForPickup, out.overdue, out.unclaimed] = await Promise.all([
          n(open),
          n(and(open, eq(repairs.status, "ready"))),
          n(and(open, ne(repairs.status, "ready"), lt(repairs.estimatedReadyAt, new Date()))),
          n(and(open, isNull(repairs.technicianId))),
        ]);
      })(),
    );
  }

  if (can(session, { inventory: ["read"] })) {
    tasks.push(
      (async () => {
        const [row] = await db.select({ n: count() }).from(products).where(and(eq(products.active, true), lte(products.qtyOnHand, products.minQty)));
        out.lowStock = row?.n ?? 0;
      })(),
    );
  }

  if (can(session, { inquiry: ["read"] })) {
    tasks.push(
      (async () => {
        const [row] = await db.select({ n: count() }).from(inquiries).where(eq(inquiries.status, "new"));
        out.newInquiries = row?.n ?? 0;
      })(),
    );
  }

  if (can(session, { report: ["read"] })) {
    // Money received (repairs + non-voided sales), Africa/Bamako = UTC.
    const received = async (since: Date) => {
      const [row] = await db
        .select({ total: sum(payments.amount).mapWith(Number) })
        .from(payments)
        .leftJoin(sales, eq(sales.id, payments.saleId))
        .where(and(isNull(payments.voidedAt), isNull(sales.voidedAt), gte(payments.createdAt, since)));
      return row?.total ?? 0;
    };
    tasks.push(
      (async () => {
        const startOfDay = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
        [out.todayRevenue, out.monthRevenue] = await Promise.all([received(startOfDay), received(new Date(Date.now() - 30 * 86400_000))]);
      })(),
    );
  }

  await Promise.all(tasks);
  return out;
}
