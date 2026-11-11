/**
 * Expenses (SPEC §2.9): admin and reception record them; only the admin sees
 * the list and totals, voids them, and manages categories (ASSUMPTION 12).
 */
import { asc, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";
import { db } from "@/server/db/client";
import { expenseCategories, expenses, user } from "@/server/db/schema";
import { AppError, forbidden, notFound } from "@/server/errors";
import { assertCan, can, type StaffSession } from "@/server/auth/session";
import type { Expense, ExpenseCategory } from "@/shared/domain/types";
import { expenseSchema, voidSchema, type ExpenseInput } from "@/shared/schemas/staff";
import { audit, currentBranchId, isUniqueViolation, orUndef } from "./_shared";

const creator = alias(user, "creator");
const voider = alias(user, "voider");

async function loadExpenses(where?: ReturnType<typeof eq>, limit = 500): Promise<Expense[]> {
  const rows = await db
    .select({ e: expenses, category: expenseCategories.name, createdBy: creator.name, voidedBy: voider.name })
    .from(expenses)
    .innerJoin(expenseCategories, eq(expenseCategories.id, expenses.categoryId))
    .leftJoin(creator, eq(creator.id, expenses.createdBy))
    .leftJoin(voider, eq(voider.id, expenses.voidedBy))
    .where(where)
    .orderBy(desc(expenses.date), desc(expenses.createdAt))
    .limit(limit);
  return rows.map(({ e, category, createdBy, voidedBy }) => ({
    id: e.id,
    date: new Date(`${e.date}T00:00:00Z`).toISOString(),
    category: { id: e.categoryId, name: category },
    amount: e.amount,
    method: e.method,
    note: orUndef(e.note),
    createdBy: createdBy ?? "—",
    ...(e.voidedAt && { voided: { at: e.voidedAt.toISOString(), by: voidedBy ?? "—", reason: e.voidReason ?? "" } }),
  }));
}

export async function listExpenses(session: StaffSession): Promise<Expense[]> {
  assertCan(session, { expense: ["read"] });
  return loadExpenses();
}

/** Anyone who can record an expense needs the categories. */
export async function listExpenseCategories(session: StaffSession): Promise<ExpenseCategory[]> {
  if (!can(session, { expense: ["create"] }) && !can(session, { expense: ["read"] })) throw forbidden();
  return db.select({ id: expenseCategories.id, name: expenseCategories.name }).from(expenseCategories).orderBy(asc(expenseCategories.name));
}

const categorySchema = z.object({ name: z.string().trim().min(1, "Le nom est requis.").max(60, "Nom trop long.") });

export async function createExpenseCategory(session: StaffSession, input: { name: string }): Promise<ExpenseCategory> {
  assertCan(session, { expense: ["manage-categories"] });
  const { name } = categorySchema.parse(input);
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx.insert(expenseCategories).values({ name, createdBy: session.user.id }).returning({ id: expenseCategories.id, name: expenseCategories.name });
      await audit(tx, session, { action: "create", entity: "Catégorie de dépenses", entityId: row!.id, entityRef: name, summary: "Catégorie ajoutée." });
      return row!;
    });
  } catch (err) {
    if (isUniqueViolation(err)) throw new AppError("DUPLICATE_CATEGORY", "Cette catégorie existe déjà.", 409);
    throw err;
  }
}

export async function createExpense(session: StaffSession, input: ExpenseInput): Promise<Expense> {
  assertCan(session, { expense: ["create"] });
  const v = expenseSchema.parse(input);
  const date = v.date.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) throw new AppError("INVALID_DATE", "Date invalide.", 422);
  if (date > new Date().toISOString().slice(0, 10)) throw new AppError("FUTURE_DATE", "La date ne peut pas être dans le futur.", 422);
  const [category] = await db.select({ id: expenseCategories.id, name: expenseCategories.name }).from(expenseCategories).where(eq(expenseCategories.id, v.categoryId)).limit(1);
  if (!category) throw new AppError("UNKNOWN_CATEGORY", "Choisissez une catégorie existante.", 422);

  const id = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(expenses)
      .values({ branchId: await currentBranchId(tx), date, categoryId: category.id, amount: v.amount, method: v.method, note: v.note || null, createdBy: session.user.id })
      .returning({ id: expenses.id });
    await audit(tx, session, { action: "create", entity: "Dépense", entityId: row!.id, entityRef: category.name, summary: `Dépense de ${v.amount} FCFA (${category.name}).` });
    return row!.id;
  });
  const [saved] = await loadExpenses(eq(expenses.id, id), 1);
  return saved!;
}

export async function voidExpense(session: StaffSession, id: string, input: { reason: string }): Promise<Expense> {
  assertCan(session, { expense: ["void"] });
  const { reason } = voidSchema.parse(input);
  await db.transaction(async (tx) => {
    const [e] = await tx.select().from(expenses).where(eq(expenses.id, id)).for("update").limit(1);
    if (!e) throw notFound("Dépense");
    if (e.voidedAt) throw new AppError("ALREADY_VOIDED", "Cette dépense est déjà annulée.", 409);
    await tx.update(expenses).set({ voidedAt: new Date(), voidedBy: session.user.id, voidReason: reason }).where(eq(expenses.id, id));
    await audit(tx, session, { action: "void", entity: "Dépense", entityId: id, entityRef: e.date, summary: `Dépense de ${e.amount} FCFA annulée : ${reason}`, before: { amount: e.amount } });
  });
  const [saved] = await loadExpenses(eq(expenses.id, id), 1);
  return saved!;
}
