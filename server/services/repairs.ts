/**
 * Repair tickets (SPEC §2.1–2.4): intake, technician queue and claiming,
 * the status machine (shared/domain/repair-flow.ts), quote and service lines,
 * parts taken from stock at their frozen average cost, deposits and payments,
 * and pickup only once the balance is zero (no credit).
 *
 * Technicians see the unclaimed queue and their own tickets only
 * (SPEC ASSUMPTION 5); admin and reception see and reassign everything.
 */
import { and, asc, desc, eq, ilike, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/server/db/client";
import {
  customers,
  documentCounters,
  payments,
  repairLines,
  repairStatusEvents,
  repairs,
  services,
  user,
} from "@/server/db/schema";
import { AppError, forbidden, notFound } from "@/server/errors";
import { assertCan, can, type StaffSession } from "@/server/auth/session";
import { OPEN_STATUSES } from "@/shared/domain/labels";
import { linesTotal } from "@/shared/domain/money";
import { nextStatuses } from "@/shared/domain/repair-flow";
import type { LineItem, Payment, Repair, RepairStatus, RepairStatusEvent } from "@/shared/domain/types";
import { normalizeMaliPhone } from "@/shared/phone";
import { lineSchema, paymentSchema, repairIntakeSchema, voidSchema, type LineInput, type PaymentInput, type RepairIntakeInput } from "@/shared/schemas/staff";
import { z } from "zod";
import { audit, currentBranchId, orUndef, type Runner, type Tx } from "./_shared";
import { lockProducts, moveStock } from "./inventory";
import { readSettings } from "./settings";

const technician = alias(user, "technician");
const actor = alias(user, "actor");
const voider = alias(user, "voider");

/** Statuses where lines can no longer change (UI mirrors this in LinesCard). */
const LINES_LOCKED: RepairStatus[] = ["quote_sent", "ready", "picked_up", "cancelled", "returned_unrepaired", "refused"];
const CLOSED: RepairStatus[] = ["picked_up", "cancelled", "returned_unrepaired", "unrepairable"];

export type RepairFilters = { q?: string; status?: RepairStatus | "open" | "all"; technicianId?: string };

// ───────────────────────────── Loading ─────────────────────────────

/** Technicians only see the unclaimed queue and their own tickets. */
function scopeFor(session: StaffSession): SQL | undefined {
  if (session.user.role !== "technician") return undefined;
  return or(isNull(repairs.technicianId), eq(repairs.technicianId, session.user.id));
}

export async function loadRepairs(runner: Runner, where?: SQL, limit = 300): Promise<Repair[]> {
  const heads = await runner
    .select({ r: repairs, customerName: customers.name, customerPhone: customers.phone, technicianName: technician.name })
    .from(repairs)
    .innerJoin(customers, eq(customers.id, repairs.customerId))
    .leftJoin(technician, eq(technician.id, repairs.technicianId))
    .where(where)
    .orderBy(desc(repairs.updatedAt))
    .limit(limit);
  if (!heads.length) return [];
  const ids = heads.map((h) => h.r.id);

  const [lines, pays, events] = await Promise.all([
    runner
      .select({ l: repairLines, discountBy: actor.name })
      .from(repairLines)
      .leftJoin(actor, eq(actor.id, repairLines.discountBy))
      .where(and(inArray(repairLines.repairId, ids), isNull(repairLines.removedAt)))
      .orderBy(asc(repairLines.createdAt)),
    runner
      .select({ p: payments, receivedBy: actor.name, voidedBy: voider.name })
      .from(payments)
      .leftJoin(actor, eq(actor.id, payments.receivedBy))
      .leftJoin(voider, eq(voider.id, payments.voidedBy))
      .where(inArray(payments.repairId, ids))
      .orderBy(asc(payments.createdAt)),
    runner
      .select({ e: repairStatusEvents, by: actor.name })
      .from(repairStatusEvents)
      .leftJoin(actor, eq(actor.id, repairStatusEvents.by))
      .where(inArray(repairStatusEvents.repairId, ids))
      .orderBy(asc(repairStatusEvents.at)),
  ]);

  const group = <T,>(rows: T[], key: (r: T) => string) => {
    const m = new Map<string, T[]>();
    for (const r of rows) m.set(key(r), [...(m.get(key(r)) ?? []), r]);
    return m;
  };
  const linesBy = group(lines, (x) => x.l.repairId);
  const paysBy = group(pays, (x) => x.p.repairId!);
  const eventsBy = group(events, (x) => x.e.repairId);

  return heads.map(({ r, customerName, customerPhone, technicianName }) => ({
    id: r.id,
    code: r.code,
    customer: { id: r.customerId, name: customerName, phone: customerPhone },
    device: { brand: r.brand, model: r.model, color: orUndef(r.color), imei: orUndef(r.imei) },
    fault: r.fault,
    conditionNotes: orUndef(r.conditionNotes),
    accessories: orUndef(r.accessories),
    diagnosis: orUndef(r.diagnosis),
    mode: r.mode,
    status: r.status,
    technician: r.technicianId ? { id: r.technicianId, name: technicianName ?? "—" } : undefined,
    lines: (linesBy.get(r.id) ?? []).map(
      ({ l, discountBy }): LineItem => ({
        id: l.id,
        kind: l.kind,
        refId: orUndef(l.productId ?? l.serviceId),
        label: l.label,
        qty: l.qty,
        unitPrice: l.unitPrice,
        discount: l.discount,
        discountBy: l.discount > 0 ? (discountBy ?? undefined) : undefined,
      }),
    ),
    payments: (paysBy.get(r.id) ?? []).map(
      ({ p, receivedBy, voidedBy }): Payment => ({
        id: p.id,
        amount: p.amount,
        method: p.method,
        kind: p.kind,
        receivedBy: receivedBy ?? "—",
        at: p.createdAt.toISOString(),
        ...(p.voidedAt && { voided: { at: p.voidedAt.toISOString(), by: voidedBy ?? "—", reason: p.voidReason ?? "" } }),
      }),
    ),
    events: (eventsBy.get(r.id) ?? []).map(
      ({ e, by }): RepairStatusEvent => ({ id: e.id, from: e.fromStatus ?? null, to: e.toStatus, by: by ?? "—", at: e.at.toISOString(), note: orUndef(e.note) }),
    ),
    estimatedReadyAt: r.estimatedReadyAt?.toISOString(),
    invoiceNumber: orUndef(r.invoiceNumber),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function listRepairs(session: StaffSession, f: RepairFilters = {}): Promise<Repair[]> {
  assertCan(session, { repair: ["read"] });
  const q = f.q?.trim();
  const digits = q?.replace(/\D/g, "") ?? "";
  const conditions = [
    scopeFor(session),
    !f.status || f.status === "all" ? undefined : f.status === "open" ? inArray(repairs.status, OPEN_STATUSES) : eq(repairs.status, f.status),
    !f.technicianId ? undefined : f.technicianId === "unclaimed" ? isNull(repairs.technicianId) : eq(repairs.technicianId, f.technicianId),
    q
      ? or(
          ilike(repairs.code, `%${q}%`),
          ilike(customers.name, `%${q}%`),
          ilike(repairs.brand, `%${q}%`),
          ilike(repairs.model, `%${q}%`),
          ilike(sql`${repairs.brand} || ' ' || ${repairs.model}`, `%${q}%`),
          digits.length >= 2 ? ilike(customers.phone, `%${digits}%`) : undefined,
        )
      : undefined,
  ];
  return loadRepairs(db, and(...conditions));
}

/** Loads one ticket and checks the caller may see it. */
async function loadVisible(session: StaffSession, id: string, runner: Runner = db): Promise<Repair> {
  if (!z.uuid().safeParse(id).success) throw notFound("Réparation");
  const [r] = await loadRepairs(runner, and(eq(repairs.id, id), scopeFor(session)), 1);
  if (!r) throw notFound("Réparation");
  return r;
}

export async function getRepair(session: StaffSession, id: string): Promise<Repair> {
  assertCan(session, { repair: ["read"] });
  return loadVisible(session, id);
}

// ───────────────────────────── Helpers ─────────────────────────────

const CODE_CHARS = "ABCDEFGHJKMNPQRSTVWXYZ23456789";
function randomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `SS-${Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join("")}`;
}

async function uniqueCode(tx: Tx) {
  for (let i = 0; i < 8; i++) {
    const code = randomCode();
    const [taken] = await tx.select({ id: repairs.id }).from(repairs).where(eq(repairs.code, code)).limit(1);
    if (!taken) return code;
  }
  throw new AppError("CODE_GENERATION", "Impossible de générer un code de suivi. Réessayez.", 500);
}

/** Row-locks the ticket for a write and checks the technician owns it. */
async function lockRepair(tx: Tx, session: StaffSession, id: string) {
  if (!z.uuid().safeParse(id).success) throw notFound("Réparation");
  const [r] = await tx.select().from(repairs).where(eq(repairs.id, id)).for("update").limit(1);
  if (!r) throw notFound("Réparation");
  if (session.user.role === "technician" && r.technicianId !== session.user.id) {
    if (r.technicianId === null) throw new AppError("NOT_CLAIMED", "Prenez d'abord ce ticket en charge.", 409);
    throw forbidden();
  }
  return r;
}

async function touch(tx: Tx, id: string) {
  await tx.update(repairs).set({ updatedAt: new Date() }).where(eq(repairs.id, id));
}

async function totals(tx: Tx, repairId: string) {
  const lines = await tx
    .select({ qty: repairLines.qty, unitPrice: repairLines.unitPrice, discount: repairLines.discount })
    .from(repairLines)
    .where(and(eq(repairLines.repairId, repairId), isNull(repairLines.removedAt)));
  const [{ paid }] = (await tx
    .select({ paid: sql<number>`coalesce(sum(${payments.amount}), 0)::int` })
    .from(payments)
    .where(and(eq(payments.repairId, repairId), isNull(payments.voidedAt)))) as [{ paid: number }];
  const total = linesTotal(lines);
  return { total, paid, due: Math.max(0, total - paid) };
}

/** Inserts one line; product lines take the part out of stock at its current average cost. */
async function insertLine(tx: Tx, session: StaffSession, repairId: string, code: string, line: LineInput) {
  const v = lineSchema.parse(line);
  if (v.discount > v.qty * v.unitPrice) throw new AppError("DISCOUNT_TOO_HIGH", "La remise dépasse le montant de la ligne.", 422);
  let productId: string | null = null;
  let serviceId: string | null = null;
  let unitCost = 0;
  let label = v.label;
  if (v.kind === "product") {
    if (!v.refId || !z.uuid().safeParse(v.refId).success) throw new AppError("INVALID_LINE", "Choisissez une pièce du stock.", 422);
    const p = (await lockProducts(tx, [v.refId])).get(v.refId);
    if (!p) throw notFound("Produit");
    productId = p.id;
    unitCost = p.avgCost;
    label = p.name;
    await moveStock(tx, session, { productId: p.id, type: "repair_use", qtyDelta: -v.qty, unitCost: p.avgCost, ref: code, repairId });
  } else if (v.refId) {
    if (!z.uuid().safeParse(v.refId).success) throw notFound("Prestation");
    const [s] = await tx.select({ id: services.id }).from(services).where(eq(services.id, v.refId)).limit(1);
    if (!s) throw notFound("Prestation");
    serviceId = s.id;
  }
  await tx.insert(repairLines).values({
    repairId,
    kind: v.kind,
    productId,
    serviceId,
    label,
    qty: v.qty,
    unitPrice: v.unitPrice,
    unitCost,
    discount: v.discount,
    discountBy: v.discount > 0 ? session.user.id : null,
    createdBy: session.user.id,
  });
  if (v.discount > 0) {
    await audit(tx, session, { action: "discount", entity: "Réparation", entityId: repairId, entityRef: code, summary: `Remise de ${v.discount} FCFA sur « ${label} ».` });
  }
}

async function insertPayment(tx: Tx, session: StaffSession, repairId: string, code: string, input: PaymentInput, kind: "deposit" | "payment") {
  await tx.insert(payments).values({
    branchId: await currentBranchId(tx),
    repairId,
    amount: input.amount,
    method: input.method,
    kind,
    receivedBy: session.user.id,
  });
  await audit(tx, session, {
    action: "create",
    entity: "Paiement",
    entityId: repairId,
    entityRef: code,
    summary: `${kind === "deposit" ? "Acompte" : "Paiement"} de ${input.amount} FCFA.`,
  });
}

// ───────────────────────────── Intake ─────────────────────────────

/** Finds the customer by id or phone (one per number), or creates it. */
async function findOrCreateCustomer(tx: Tx, session: StaffSession, input: { customerId?: string; name: string; phone: string }) {
  const phone = normalizeMaliPhone(input.phone);
  if (!phone) throw new AppError("INVALID_PHONE", "Numéro invalide (8 chiffres, ex. 70 12 34 56).", 422);
  if (input.customerId && z.uuid().safeParse(input.customerId).success) {
    const [c] = await tx.select().from(customers).where(eq(customers.id, input.customerId)).limit(1);
    if (c) return c;
  }
  const [byPhone] = await tx.select().from(customers).where(eq(customers.phone, phone)).limit(1);
  if (byPhone) return byPhone;
  assertCan(session, { customer: ["create"] });
  const [created] = await tx.insert(customers).values({ name: input.name, phone, createdBy: session.user.id }).onConflictDoNothing().returning();
  if (created) return created;
  const [raced] = await tx.select().from(customers).where(eq(customers.phone, phone)).limit(1);
  return raced!;
}

/** Creates the ticket inside an open transaction (used by intake and inquiry conversion). */
export async function createRepairTx(tx: Tx, session: StaffSession, v: RepairIntakeInput): Promise<string> {
  const customer = await findOrCreateCustomer(tx, session, { customerId: v.customerId, name: v.customerName, phone: v.customerPhone });
  const code = await uniqueCode(tx);
  const estimated = v.estimatedReadyAt ? new Date(v.estimatedReadyAt) : null;
  const [row] = await tx
    .insert(repairs)
    .values({
      branchId: await currentBranchId(tx),
      code,
      customerId: customer.id,
      brand: v.brand,
      model: v.model,
      color: v.color || null,
      imei: v.imei || null,
      fault: v.fault,
      conditionNotes: v.conditionNotes || null,
      accessories: v.accessories || null,
      mode: v.mode,
      estimatedReadyAt: estimated && !Number.isNaN(estimated.getTime()) ? estimated : null,
      createdBy: session.user.id,
    })
    .returning({ id: repairs.id });
  const id = row!.id;
  await tx.insert(repairStatusEvents).values({ repairId: id, fromStatus: null, toStatus: "received", by: session.user.id });

  if (v.mode === "fixed") for (const l of v.lines) await insertLine(tx, session, id, code, l);
  if (v.deposit > 0) {
    assertCan(session, { payment: ["create"] });
    if (v.mode === "fixed") {
      const { total } = await totals(tx, id);
      if (v.deposit > total) throw new AppError("OVERPAYMENT", "L'acompte dépasse le prix convenu.", 422);
    }
    await insertPayment(tx, session, id, code, { amount: v.deposit, method: v.depositMethod }, "deposit");
  }
  await audit(tx, session, { action: "create", entity: "Réparation", entityId: id, entityRef: code, summary: `Ticket créé pour ${customer.name} (${v.brand} ${v.model}).` });
  return id;
}

export async function createRepair(session: StaffSession, input: RepairIntakeInput): Promise<Repair> {
  assertCan(session, { repair: ["create"] });
  const v = repairIntakeSchema.parse(input);
  const id = await db.transaction((tx) => createRepairTx(tx, session, v));
  return loadVisible(session, id);
}

// ───────────────────────────── Workflow ─────────────────────────────

export async function claimRepair(session: StaffSession, id: string): Promise<Repair> {
  assertCan(session, { repair: ["claim"] });
  if (!z.uuid().safeParse(id).success) throw notFound("Réparation");
  await db.transaction(async (tx) => {
    const [r] = await tx.select().from(repairs).where(eq(repairs.id, id)).for("update").limit(1);
    if (!r) throw notFound("Réparation");
    if (CLOSED.includes(r.status)) throw new AppError("CLOSED", "Ce ticket est clôturé.", 409);
    if (r.technicianId && r.technicianId !== session.user.id) throw new AppError("ALREADY_CLAIMED", "Déjà pris en charge par un autre technicien.", 409);
    await tx.update(repairs).set({ technicianId: session.user.id }).where(eq(repairs.id, id));
  });
  return loadVisible(session, id);
}

export async function assignRepair(session: StaffSession, id: string, technicianId: string | null): Promise<Repair> {
  assertCan(session, { repair: ["assign"] });
  await db.transaction(async (tx) => {
    const r = await lockRepair(tx, session, id);
    if (CLOSED.includes(r.status)) throw new AppError("CLOSED", "Ce ticket est clôturé.", 409);
    let name = "la file d'attente";
    if (technicianId) {
      const [t] = await tx.select({ id: user.id, name: user.name, role: user.role, banned: user.banned }).from(user).where(eq(user.id, technicianId)).limit(1);
      if (!t || t.role !== "technician" || t.banned) throw new AppError("INVALID_TECHNICIAN", "Choisissez un technicien actif.", 422);
      name = t.name;
    }
    await tx.update(repairs).set({ technicianId }).where(eq(repairs.id, id));
    await audit(tx, session, { action: "update", entity: "Réparation", entityId: id, entityRef: r.code, summary: `Ticket confié à ${name}.` });
  });
  return loadVisible(session, id);
}

export async function changeRepairStatus(session: StaffSession, id: string, to: RepairStatus, note?: string): Promise<Repair> {
  const decision = to === "approved" || to === "refused";
  assertCan(session, decision ? { repair: ["quote-decision"] } : { repair: ["set-status"] });
  // Handing the device back means taking the balance: counter staff only.
  if (to === "picked_up") assertCan(session, { payment: ["create"] });
  await db.transaction(async (tx) => {
    const r = await lockRepair(tx, session, id);
    if (!nextStatuses(r.mode, r.status).includes(to)) throw new AppError("INVALID_TRANSITION", "Ce changement de statut n'est pas autorisé.", 409);
    const { total, due } = await totals(tx, id);
    if (to === "quote_sent" && total === 0) throw new AppError("EMPTY_QUOTE", "Ajoutez les lignes du devis avant de l'envoyer.", 409);
    if (to === "picked_up" && due > 0) throw new AppError("BALANCE_DUE", `Le solde de ${due} FCFA doit être réglé avant la remise de l'appareil.`, 409);

    const patch: Partial<typeof repairs.$inferInsert> = { status: to };
    if (to === "picked_up") {
      patch.pickedUpAt = new Date();
      if (total > 0) {
        const settings = await readSettings();
        const [counter] = await tx
          .insert(documentCounters)
          .values({ branchId: r.branchId, kind: "invoice", value: 1 })
          .onConflictDoUpdate({ target: [documentCounters.branchId, documentCounters.kind], set: { value: sql`${documentCounters.value} + 1` } })
          .returning({ value: documentCounters.value });
        patch.invoiceNumber = `${settings.prefixes.invoice}-${String(counter!.value).padStart(5, "0")}`;
      }
    }
    await tx.update(repairs).set(patch).where(eq(repairs.id, id));
    await tx.insert(repairStatusEvents).values({ repairId: id, fromStatus: r.status, toStatus: to, note: note?.trim() || null, by: session.user.id });
  });
  return loadVisible(session, id);
}

const diagnosisSchema = z.object({ diagnosis: z.string().trim().max(2000, "Diagnostic trop long.") });

export async function updateRepairDiagnosis(session: StaffSession, id: string, input: { diagnosis: string }): Promise<Repair> {
  assertCan(session, { repair: ["update"] });
  const { diagnosis } = diagnosisSchema.parse(input);
  await db.transaction(async (tx) => {
    const r = await lockRepair(tx, session, id);
    if (["picked_up", "cancelled", "returned_unrepaired"].includes(r.status)) throw new AppError("CLOSED", "Ce ticket est clôturé.", 409);
    await tx.update(repairs).set({ diagnosis: diagnosis || null }).where(eq(repairs.id, id));
  });
  return loadVisible(session, id);
}

export async function addRepairLine(session: StaffSession, id: string, line: LineInput): Promise<Repair> {
  assertCan(session, { repair: ["update"] });
  await db.transaction(async (tx) => {
    const r = await lockRepair(tx, session, id);
    if (LINES_LOCKED.includes(r.status)) throw new AppError("LINES_LOCKED", "Les lignes ne peuvent plus être modifiées à cette étape.", 409);
    await insertLine(tx, session, id, r.code, line);
    await touch(tx, id);
  });
  return loadVisible(session, id);
}

export async function removeRepairLine(session: StaffSession, id: string, lineId: string): Promise<Repair> {
  assertCan(session, { repair: ["update"] });
  await db.transaction(async (tx) => {
    const r = await lockRepair(tx, session, id);
    if (LINES_LOCKED.includes(r.status)) throw new AppError("LINES_LOCKED", "Les lignes ne peuvent plus être modifiées à cette étape.", 409);
    if (!z.uuid().safeParse(lineId).success) throw notFound("Ligne");
    const [l] = await tx
      .select()
      .from(repairLines)
      .where(and(eq(repairLines.id, lineId), eq(repairLines.repairId, id), isNull(repairLines.removedAt)))
      .limit(1);
    if (!l) throw notFound("Ligne");
    // Paid amounts must stay covered: a line can't be removed below what was already paid.
    const { total, paid } = await totals(tx, id);
    const lineAmount = Math.max(0, l.qty * l.unitPrice - l.discount);
    if (r.mode === "fixed" && total - lineAmount < paid) {
      throw new AppError("PAID_LINE", "Cette ligne est déjà payée : annulez d'abord le paiement.", 409);
    }
    await tx.update(repairLines).set({ removedAt: new Date(), removedBy: session.user.id }).where(eq(repairLines.id, lineId));
    if (l.kind === "product" && l.productId) {
      const p = (await lockProducts(tx, [l.productId])).get(l.productId);
      if (p) await moveStock(tx, session, { productId: p.id, type: "void", qtyDelta: l.qty, unitCost: p.avgCost, ref: r.code, reason: "Ligne retirée", repairId: id });
    }
    await audit(tx, session, { action: "update", entity: "Réparation", entityId: id, entityRef: r.code, summary: `Ligne « ${l.label} » retirée.` });
    await touch(tx, id);
  });
  return loadVisible(session, id);
}

export async function recordRepairPayment(session: StaffSession, id: string, input: PaymentInput): Promise<Repair> {
  assertCan(session, { payment: ["create"] });
  const v = paymentSchema.parse(input);
  await db.transaction(async (tx) => {
    const r = await lockRepair(tx, session, id);
    if (["picked_up", "cancelled", "returned_unrepaired"].includes(r.status)) throw new AppError("CLOSED", "Ce ticket est clôturé.", 409);
    const { due } = await totals(tx, id);
    if (v.amount > due) throw new AppError("OVERPAYMENT", `Le montant dépasse le solde restant (${due} FCFA).`, 422);
    // Partial payments only as a deposit; at "ready" it is the final payment (SPEC §1).
    await insertPayment(tx, session, id, r.code, v, r.status === "ready" ? "payment" : "deposit");
    await touch(tx, id);
  });
  return loadVisible(session, id);
}

export async function voidRepairPayment(session: StaffSession, repairId: string, paymentId: string, input: { reason: string }): Promise<Repair> {
  assertCan(session, { payment: ["void"] });
  const { reason } = voidSchema.parse(input);
  await db.transaction(async (tx) => {
    const r = await lockRepair(tx, session, repairId);
    if (r.status === "picked_up") throw new AppError("CLOSED", "L'appareil a été remis : le paiement ne peut plus être annulé.", 409);
    if (!z.uuid().safeParse(paymentId).success) throw notFound("Paiement");
    const [p] = await tx.select().from(payments).where(and(eq(payments.id, paymentId), eq(payments.repairId, repairId))).for("update").limit(1);
    if (!p) throw notFound("Paiement");
    if (p.voidedAt) throw new AppError("ALREADY_VOIDED", "Ce paiement est déjà annulé.", 409);
    await tx.update(payments).set({ voidedAt: new Date(), voidedBy: session.user.id, voidReason: reason }).where(eq(payments.id, paymentId));
    await audit(tx, session, { action: "void", entity: "Paiement", entityId: repairId, entityRef: r.code, summary: `Paiement de ${p.amount} FCFA annulé : ${reason}`, before: { amount: p.amount } });
    await touch(tx, repairId);
  });
  return loadVisible(session, repairId);
}

/** For customer pages: tickets of one customer the caller may see. */
export async function repairsOfCustomer(session: StaffSession, customerId: string): Promise<Repair[]> {
  if (!can(session, { repair: ["read"] })) return [];
  return loadRepairs(db, and(eq(repairs.customerId, customerId), scopeFor(session)));
}

