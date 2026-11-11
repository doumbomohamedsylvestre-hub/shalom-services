/**
 * Public side of the workshop (SPEC §2.7, §2.8): inquiry / quote / contact
 * forms land in the inbox, reception converts one into a customer + repair
 * ticket, and customers track a repair with code + phone. Public endpoints
 * are protected by a honeypot and a per-IP rate limit (SPEC ASSUMPTION 4).
 */
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db/client";
import { customers, inquiries, publicRateLimits, repairStatusEvents, repairs } from "@/server/db/schema";
import { AppError, notFound } from "@/server/errors";
import { assertCan, type StaffSession } from "@/server/auth/session";
import type { Inquiry, InquiryStatus, Repair, TrackingResult } from "@/shared/domain/types";
import { normalizeMaliPhone } from "@/shared/phone";
import { inquirySchema, trackingSchema, type InquiryInput, type TrackingInput } from "@/shared/schemas/public";
import { audit, orUndef } from "./_shared";
import { createRepairTx, getRepair } from "./repairs";

// ───────────────────────────── Rate limit ─────────────────────────────

/** Fixed window counter in Postgres (serverless instances share it). Throws 429 past `max`. */
async function rateLimit(key: string, max: number, windowSeconds: number) {
  const [row] = await db
    .insert(publicRateLimits)
    .values({ key, windowStart: new Date(), count: 1 })
    .onConflictDoUpdate({
      target: publicRateLimits.key,
      set: {
        count: sql`case when ${publicRateLimits.windowStart} < now() - make_interval(secs => ${windowSeconds}) then 1 else ${publicRateLimits.count} + 1 end`,
        windowStart: sql`case when ${publicRateLimits.windowStart} < now() - make_interval(secs => ${windowSeconds}) then now() else ${publicRateLimits.windowStart} end`,
      },
    })
    .returning({ count: publicRateLimits.count });
  if ((row?.count ?? 0) > max) {
    throw new AppError("RATE_LIMITED", "Trop de tentatives. Patientez quelques minutes puis réessayez.", 429);
  }
}

// ───────────────────────────── Public ─────────────────────────────

export async function submitInquiry(input: InquiryInput, ip: string): Promise<{ id: string }> {
  const v = inquirySchema.parse(input);
  await rateLimit(`inquiry:${ip}`, 5, 10 * 60);
  // Honeypot filled: pretend it worked, store nothing.
  if (v.website) return { id: "ok" };
  const [row] = await db
    .insert(inquiries)
    .values({
      type: v.type,
      name: v.name,
      phone: normalizeMaliPhone(v.phone) ?? v.phone,
      device: v.device || null,
      message: v.message,
    })
    .returning({ id: inquiries.id });
  return { id: row!.id };
}

/** "Mamadou Traoré" → "Mamadou T." */
function maskName(name: string) {
  const [first = "", ...rest] = name.trim().split(/\s+/);
  return `${first} ${rest.map((p) => `${p[0]?.toUpperCase()}.`).join(" ")}`.trim();
}

export async function trackRepair(input: TrackingInput, ip: string): Promise<TrackingResult> {
  const v = trackingSchema.parse(input);
  await rateLimit(`track:${ip}`, 20, 10 * 60);
  const phone = normalizeMaliPhone(v.phone);
  const [r] = await db
    .select({ id: repairs.id, code: repairs.code, brand: repairs.brand, model: repairs.model, status: repairs.status, estimatedReadyAt: repairs.estimatedReadyAt, name: customers.name, phone: customers.phone })
    .from(repairs)
    .innerJoin(customers, eq(customers.id, repairs.customerId))
    .where(eq(repairs.code, v.code))
    .limit(1);
  // Same answer for "unknown code" and "wrong phone": no enumeration.
  if (!r || r.phone !== phone) throw new AppError("NOT_FOUND", "Aucune réparation ne correspond à ce code et ce numéro.", 404);
  const events = await db
    .select({ status: repairStatusEvents.toStatus, at: repairStatusEvents.at })
    .from(repairStatusEvents)
    .where(eq(repairStatusEvents.repairId, r.id))
    .orderBy(repairStatusEvents.at);
  return {
    code: r.code,
    maskedName: maskName(r.name),
    device: `${r.brand} ${r.model}`,
    status: r.status,
    estimatedReadyAt: r.estimatedReadyAt?.toISOString(),
    timeline: events.map((e) => ({ status: e.status, at: e.at.toISOString() })),
  };
}

// ───────────────────────────── Inbox ─────────────────────────────

export async function listInquiries(session: StaffSession): Promise<Inquiry[]> {
  assertCan(session, { inquiry: ["read"] });
  const rows = await db
    .select({ i: inquiries, code: repairs.code })
    .from(inquiries)
    .leftJoin(repairs, eq(repairs.id, inquiries.convertedRepairId))
    .orderBy(desc(inquiries.createdAt))
    .limit(500);
  return rows.map(({ i, code }) => ({
    id: i.id,
    type: i.type,
    name: i.name,
    phone: i.phone,
    device: orUndef(i.device),
    message: i.message,
    status: i.status,
    convertedRepairCode: orUndef(code),
    createdAt: i.createdAt.toISOString(),
  }));
}

const statusSchema = z.object({ status: z.enum(["new", "contacted", "closed"]) });

export async function setInquiryStatus(session: StaffSession, id: string, input: { status: InquiryStatus }): Promise<Inquiry> {
  assertCan(session, { inquiry: ["update"] });
  const { status } = statusSchema.parse(input);
  if (!z.uuid().safeParse(id).success) throw notFound("Demande");
  const [row] = await db
    .update(inquiries)
    .set({ status, updatedBy: session.user.id })
    .where(and(eq(inquiries.id, id), sql`${inquiries.status} <> 'converted'`))
    .returning({ id: inquiries.id });
  if (!row) throw new AppError("NOT_UPDATABLE", "Demande introuvable ou déjà convertie.", 409);
  const all = await listInquiries(session);
  return all.find((i) => i.id === id)!;
}

/** One click: customer (found or created by phone) + repair ticket in quote mode. */
export async function convertInquiry(session: StaffSession, id: string): Promise<Repair> {
  assertCan(session, { inquiry: ["convert"], repair: ["create"] });
  if (!z.uuid().safeParse(id).success) throw notFound("Demande");
  const repairId = await db.transaction(async (tx) => {
    const [i] = await tx.select().from(inquiries).where(eq(inquiries.id, id)).for("update").limit(1);
    if (!i) throw notFound("Demande");
    if (i.status === "converted") throw new AppError("ALREADY_CONVERTED", "Cette demande a déjà été convertie.", 409);
    if (!normalizeMaliPhone(i.phone)) throw new AppError("INVALID_PHONE", "Le numéro de cette demande n'est pas un numéro malien valide.", 422);
    const [brand = "À préciser", ...model] = (i.device ?? "").trim().split(/\s+/).filter(Boolean);
    const newId = await createRepairTx(tx, session, {
      customerName: i.name,
      customerPhone: i.phone,
      brand,
      model: model.join(" ") || "À préciser",
      color: "",
      imei: "",
      fault: i.message.slice(0, 500),
      conditionNotes: "",
      accessories: "",
      mode: "quote",
      lines: [],
      deposit: 0,
      depositMethod: "cash",
    });
    await tx.update(inquiries).set({ status: "converted", convertedRepairId: newId, updatedBy: session.user.id }).where(eq(inquiries.id, id));
    await audit(tx, session, { action: "update", entity: "Demande", entityId: id, entityRef: i.name, summary: "Demande convertie en ticket de réparation." });
    return newId;
  });
  return getRepair(session, repairId);
}
