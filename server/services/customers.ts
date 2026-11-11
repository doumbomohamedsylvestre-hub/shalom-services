/**
 * Customers: one per Mali phone number (SPEC ASSUMPTION 8). Repairs are
 * linked in the repairs phase; until then a customer's history shows sales.
 */
import { and, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { customers as customersTable, payments, sales } from "@/server/db/schema";
import { AppError, notFound } from "@/server/errors";
import { assertCan, can, type StaffSession } from "@/server/auth/session";
import type { Customer, Repair, Sale } from "@/shared/domain/types";
import { normalizeMaliPhone } from "@/shared/phone";
import { customerSchema, type CustomerInput } from "@/shared/schemas/staff";
import { isUniqueViolation, orUndef } from "./_shared";
import { loadSales } from "./sales";

type Row = typeof customersTable.$inferSelect;

/** Money actually received from this customer (non-voided payments of non-voided sales). */
const spentSql = sql<number>`coalesce((
  select sum(${payments.amount}) from ${payments}
  join ${sales} on ${sales.id} = ${payments.saleId}
  where ${sales.customerId} = ${customersTable.id} and ${sales.voidedAt} is null and ${payments.voidedAt} is null
), 0)::int`;

function toCustomer(row: Row, totalSpent: number): Customer {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    altPhone: orUndef(row.altPhone),
    notes: orUndef(row.notes),
    createdAt: row.createdAt.toISOString(),
    repairsCount: 0,
    totalSpent,
  };
}

export async function listCustomers(session: StaffSession, q?: string): Promise<Customer[]> {
  assertCan(session, { customer: ["read"] });
  const s = q?.trim();
  const digits = s?.replace(/\D/g, "") ?? "";
  const filter = s
    ? or(ilike(customersTable.name, `%${s}%`), digits.length >= 2 ? ilike(customersTable.phone, `%${digits}%`) : undefined)
    : undefined;
  const rows = await db
    .select({ row: customersTable, spent: spentSql })
    .from(customersTable)
    .where(filter)
    .orderBy(desc(customersTable.createdAt))
    .limit(500);
  return rows.map((r) => toCustomer(r.row, r.spent));
}

export async function getCustomer(session: StaffSession, id: string): Promise<{ customer: Customer; repairs: Repair[]; sales: Sale[] }> {
  assertCan(session, { customer: ["read"] });
  const [r] = await db.select({ row: customersTable, spent: spentSql }).from(customersTable).where(eq(customersTable.id, id)).limit(1);
  if (!r) throw notFound("Client");
  // Sales history needs sale:read (technicians see the customer, not the money).
  const canSeeSales = can(session, { sale: ["read"] });
  const history = canSeeSales ? await loadSales(db, eq(sales.customerId, id)) : [];
  return { customer: toCustomer(r.row, canSeeSales ? r.spent : 0), repairs: [], sales: history };
}

export async function saveCustomer(session: StaffSession, input: CustomerInput, id?: string): Promise<Customer> {
  assertCan(session, id ? { customer: ["update"] } : { customer: ["create"] });
  const v = customerSchema.parse(input);
  const phone = normalizeMaliPhone(v.phone);
  if (!phone) throw new AppError("INVALID_PHONE", "Numéro invalide (8 chiffres, ex. 70 12 34 56).", 422);
  const altPhone = v.altPhone ? normalizeMaliPhone(v.altPhone) : null;
  if (v.altPhone && !altPhone) throw new AppError("INVALID_PHONE", "Autre numéro invalide (8 chiffres).", 422);

  const [dup] = await db
    .select({ name: customersTable.name })
    .from(customersTable)
    .where(and(eq(customersTable.phone, phone), id ? ne(customersTable.id, id) : undefined))
    .limit(1);
  if (dup) throw new AppError("DUPLICATE_PHONE", `Ce numéro appartient déjà à ${dup.name}.`, 409);

  const values = { name: v.name, phone, altPhone, notes: v.notes || null };
  try {
    if (id) {
      const [row] = await db.update(customersTable).set(values).where(eq(customersTable.id, id)).returning();
      if (!row) throw notFound("Client");
      return (await listOne(row.id))!;
    }
    const [row] = await db.insert(customersTable).values({ ...values, createdBy: session.user.id }).returning();
    return toCustomer(row!, 0);
  } catch (err) {
    if (isUniqueViolation(err)) throw new AppError("DUPLICATE_PHONE", "Ce numéro appartient déjà à un autre client.", 409);
    throw err;
  }
}

async function listOne(id: string) {
  const [r] = await db.select({ row: customersTable, spent: spentSql }).from(customersTable).where(eq(customersTable.id, id)).limit(1);
  return r ? toCustomer(r.row, r.spent) : null;
}
