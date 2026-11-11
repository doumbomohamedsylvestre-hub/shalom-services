/**
 * Helpers shared by the service modules: the shop's branch, transactions and
 * the audit log. Only server/services/* import this.
 */
import { asc } from "drizzle-orm";
import { db } from "@/server/db/client";
import { auditLog, branches } from "@/server/db/schema";
import { AppError } from "@/server/errors";
import type { StaffSession } from "@/server/auth/session";

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
/** Either the pool or an open transaction. */
export type Runner = typeof db | Tx;

let branchIdCache: string | null = null;

/** v1 runs one shop: the first (seeded) branch. */
export async function currentBranchId(runner: Runner = db): Promise<string> {
  if (branchIdCache) return branchIdCache;
  const [row] = await runner.select({ id: branches.id }).from(branches).orderBy(asc(branches.createdAt)).limit(1);
  if (!row) throw new AppError("NO_BRANCH", "Boutique non configurée : lancez `npm run db:seed`.", 500);
  branchIdCache = row.id;
  return row.id;
}

export type AuditInput = {
  action: "create" | "update" | "void" | "adjust" | "receive" | "discount" | "ban" | "unban" | "role" | "password";
  entity: string;
  entityId?: string;
  entityRef?: string;
  summary: string;
  before?: unknown;
  after?: unknown;
};

/** Writes one audit_log row, inside the caller's transaction when given one. */
export async function audit(runner: Runner, session: StaffSession, entry: AuditInput) {
  await runner.insert(auditLog).values({
    actorId: session.user.id,
    actorName: session.user.name,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId,
    entityRef: entry.entityRef ?? "",
    summary: entry.summary,
    before: entry.before ?? null,
    after: entry.after ?? null,
  });
}

/** Postgres unique violation (e.g. duplicate SKU or phone) → readable AppError. */
export function isUniqueViolation(err: unknown, constraint?: string) {
  const e = (err as { cause?: { code?: string; constraint?: string } })?.cause ?? (err as { code?: string; constraint?: string });
  return e?.code === "23505" && (!constraint || e.constraint === constraint);
}

/** Postgres check violation (e.g. stock below zero). */
export function isCheckViolation(err: unknown, constraint?: string) {
  const e = (err as { cause?: { code?: string; constraint?: string } })?.cause ?? (err as { code?: string; constraint?: string });
  return e?.code === "23514" && (!constraint || e.constraint === constraint);
}

export const iso = (d: Date | string | null | undefined) => (d ? new Date(d).toISOString() : undefined);
export const orUndef = <T,>(v: T | null | undefined) => (v === null || v === undefined || v === "" ? undefined : v);
