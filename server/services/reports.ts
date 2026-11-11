/**
 * Reports (SPEC §1, admin only): revenue and profit, repair operations,
 * stock value and best sellers, over 7 days, 30 days, 3 months or 12 months.
 * Dates are bucketed in UTC (Africa/Bamako = UTC+0).
 *
 * Definitions:
 * - revenue: money received (non-voided payments; sale payments only for non-voided sales)
 * - cost of goods: frozen unit cost × qty of items sold and parts used in the period
 * - expenses: non-voided expenses dated in the period
 * - turnaround: from intake to the first "ready" in the period
 */
import { and, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { expenseCategories, expenses, payments, products, repairLines, repairStatusEvents, repairs, saleLines, sales, user } from "@/server/db/schema";
import { assertCan, type StaffSession } from "@/server/auth/session";
import type { ReportData, ReportRange, RepairStatus } from "@/shared/domain/types";

const DAY = 86400_000;

type Bucket = { start: Date; end: Date; label: string };

function startOfUtcDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Consecutive buckets covering the range and ending today (inclusive). */
export function buckets(range: ReportRange, now = new Date()): Bucket[] {
  const today = startOfUtcDay(now);
  const dayFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
  const monthFmt = new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: "UTC" });
  if (range === "12m") {
    return Array.from({ length: 12 }, (_, i) => {
      const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - (11 - i), 1));
      const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
      return { start, end, label: monthFmt.format(start) };
    });
  }
  if (range === "90d") {
    const first = new Date(today.getTime() - (13 * 7 - 1) * DAY);
    return Array.from({ length: 13 }, (_, i) => {
      const start = new Date(first.getTime() + i * 7 * DAY);
      return { start, end: new Date(start.getTime() + 7 * DAY), label: dayFmt.format(start) };
    });
  }
  const days = range === "7d" ? 7 : 30;
  return Array.from({ length: days }, (_, i) => {
    const start = new Date(today.getTime() - (days - 1 - i) * DAY);
    return { start, end: new Date(start.getTime() + DAY), label: dayFmt.format(start) };
  });
}

const hours = (ms: number) => Math.round(ms / 3600_000);

export async function getReport(session: StaffSession, range: ReportRange): Promise<ReportData> {
  assertCan(session, { report: ["read"] });
  if (!["7d", "30d", "90d", "12m"].includes(range)) range = "30d";
  const bs = buckets(range);
  const from = bs[0]!.start;
  const fromDate = from.toISOString().slice(0, 10);

  const [pays, saleCost, partsCost, expenseRows, statusRows, readyRows, decisions, topProducts, topServices, stock] = await Promise.all([
    // Money received in the period.
    db
      .select({ amount: payments.amount, at: payments.createdAt, repairId: payments.repairId })
      .from(payments)
      .leftJoin(sales, eq(sales.id, payments.saleId))
      .where(and(isNull(payments.voidedAt), isNull(sales.voidedAt), gte(payments.createdAt, from))),
    // Cost of items sold (non-voided sales).
    db
      .select({ cost: sql<number>`coalesce(sum(${saleLines.qty} * ${saleLines.unitCost}), 0)::int` })
      .from(saleLines)
      .innerJoin(sales, eq(sales.id, saleLines.saleId))
      .where(and(isNull(sales.voidedAt), gte(sales.createdAt, from))),
    // Cost of parts used in repairs (lines still on the ticket).
    db
      .select({ cost: sql<number>`coalesce(sum(${repairLines.qty} * ${repairLines.unitCost}), 0)::int` })
      .from(repairLines)
      .where(and(eq(repairLines.kind, "product"), isNull(repairLines.removedAt), gte(repairLines.createdAt, from))),
    db
      .select({ category: expenseCategories.name, amount: sql<number>`sum(${expenses.amount})::int` })
      .from(expenses)
      .innerJoin(expenseCategories, eq(expenseCategories.id, expenses.categoryId))
      .where(and(isNull(expenses.voidedAt), gte(expenses.date, fromDate)))
      .groupBy(expenseCategories.name)
      .orderBy(desc(sql`sum(${expenses.amount})`)),
    // Tickets opened in the period, by current status.
    db
      .select({ status: repairs.status, count: sql<number>`count(*)::int` })
      .from(repairs)
      .where(gte(repairs.createdAt, from))
      .groupBy(repairs.status),
    // First time each ticket became "ready", for those that did in the period.
    db
      .select({
        repairId: repairs.id,
        createdAt: repairs.createdAt,
        technician: user.name,
        readyAt: sql<Date>`min(${repairStatusEvents.at})`.mapWith((v: string | Date) => new Date(v)),
      })
      .from(repairStatusEvents)
      .innerJoin(repairs, eq(repairs.id, repairStatusEvents.repairId))
      .leftJoin(user, eq(user.id, repairs.technicianId))
      .where(eq(repairStatusEvents.toStatus, "ready"))
      .groupBy(repairs.id, repairs.createdAt, user.name)
      .having(gte(sql`min(${repairStatusEvents.at})`, from)),
    db
      .select({ to: repairStatusEvents.toStatus, count: sql<number>`count(*)::int` })
      .from(repairStatusEvents)
      .where(and(inArray(repairStatusEvents.toStatus, ["approved", "refused"]), gte(repairStatusEvents.at, from)))
      .groupBy(repairStatusEvents.toStatus),
    db
      .select({
        name: saleLines.label,
        qty: sql<number>`sum(${saleLines.qty})::int`,
        revenue: sql<number>`sum(${saleLines.qty} * ${saleLines.unitPrice} - ${saleLines.discount})::int`,
      })
      .from(saleLines)
      .innerJoin(sales, eq(sales.id, saleLines.saleId))
      .where(and(isNull(sales.voidedAt), gte(sales.createdAt, from)))
      .groupBy(saleLines.label)
      .orderBy(desc(sql`sum(${saleLines.qty} * ${saleLines.unitPrice} - ${saleLines.discount})`))
      .limit(5),
    db
      .select({
        name: repairLines.label,
        count: sql<number>`sum(${repairLines.qty})::int`,
        revenue: sql<number>`sum(${repairLines.qty} * ${repairLines.unitPrice} - ${repairLines.discount})::int`,
      })
      .from(repairLines)
      .where(and(eq(repairLines.kind, "service"), isNull(repairLines.removedAt), gte(repairLines.createdAt, from)))
      .groupBy(repairLines.label)
      .orderBy(desc(sql`sum(${repairLines.qty} * ${repairLines.unitPrice} - ${repairLines.discount})`))
      .limit(5),
    db
      .select({ value: sql<number>`coalesce(sum(${products.qtyOnHand} * ${products.avgCost}), 0)::int` })
      .from(products)
      .where(eq(products.active, true)),
  ]);

  const revenue = bs.map((b) => ({ label: b.label, repairs: 0, sales: 0 }));
  for (const p of pays) {
    const i = bs.findIndex((b) => p.at >= b.start && p.at < b.end);
    if (i < 0) continue;
    revenue[i]![p.repairId ? "repairs" : "sales"] += p.amount;
  }
  const totalRevenue = revenue.reduce((s, r) => s + r.repairs + r.sales, 0);
  const cogs = (saleCost[0]?.cost ?? 0) + (partsCost[0]?.cost ?? 0);
  const expensesTotal = expenseRows.reduce((s, e) => s + e.amount, 0);

  const byTech = new Map<string, { completed: number; totalMs: number }>();
  let allMs = 0;
  for (const r of readyRows) {
    const ms = r.readyAt.getTime() - r.createdAt.getTime();
    allMs += ms;
    const key = r.technician ?? "Non assigné";
    const t = byTech.get(key) ?? { completed: 0, totalMs: 0 };
    byTech.set(key, { completed: t.completed + 1, totalMs: t.totalMs + ms });
  }
  const approved = decisions.find((d) => d.to === "approved")?.count ?? 0;
  const refused = decisions.find((d) => d.to === "refused")?.count ?? 0;

  return {
    revenue,
    totals: { revenue: totalRevenue, cogs, expenses: expensesTotal, net: totalRevenue - cogs - expensesTotal },
    expensesByCategory: expenseRows,
    repairsByStatus: statusRows.map((r) => ({ status: r.status as RepairStatus, count: r.count })),
    technicians: [...byTech]
      .map(([name, t]) => ({ name, completed: t.completed, avgTurnaroundHours: hours(t.totalMs / t.completed) }))
      .sort((a, b) => b.completed - a.completed),
    quoteAcceptanceRate: approved + refused ? approved / (approved + refused) : 0,
    avgTurnaroundHours: readyRows.length ? hours(allMs / readyRows.length) : 0,
    topProducts,
    topServices,
    stockValue: stock[0]?.value ?? 0,
  };
}
