/** Journal: read-only view of audit_log (admin). */
import { desc } from "drizzle-orm";
import { db } from "@/server/db/client";
import { auditLog } from "@/server/db/schema";
import { assertCan, type StaffSession } from "@/server/auth/session";
import type { AuditEntry } from "@/shared/domain/types";

export async function listAudit(session: StaffSession): Promise<AuditEntry[]> {
  assertCan(session, { audit: ["read"] });
  const rows = await db.select().from(auditLog).orderBy(desc(auditLog.at)).limit(500);
  return rows.map((a) => ({
    id: a.id,
    actor: a.actorName,
    action: a.action,
    entity: a.entity,
    entityRef: a.entityRef,
    summary: a.summary,
    at: a.at.toISOString(),
  }));
}
