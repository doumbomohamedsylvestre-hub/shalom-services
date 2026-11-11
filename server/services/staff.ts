/**
 * Staff accounts (SPEC §1, §4 Auth). Admin only, except the technician list
 * used to assign repairs. Account changes go through Better Auth's admin API,
 * so passwords are hashed and sessions revoked the way the library expects.
 */
import { APIError } from "better-auth/api";
import { and, eq, inArray, max } from "drizzle-orm";
import { db } from "@/server/db/client";
import { session as sessionTable, user as userTable } from "@/server/db/schema";
import { AppError, notFound } from "@/server/errors";
import { assertCan, toRole, type StaffSession } from "@/server/auth/session";
import { auth } from "@/server/auth/auth";
import type { StaffUser } from "@/shared/domain/types";
import {
  resetPasswordSchema,
  staffUpdateSchema,
  staffUserSchema,
  type ResetPasswordInput,
  type StaffUpdateInput,
  type StaffUserInput,
} from "@/shared/schemas/staff";

/** Better Auth requires an email; staff log in by username instead. */
const placeholderEmail = (username: string) => `${username}@staff.invalid`;

const staffColumns = {
  id: userTable.id,
  name: userTable.name,
  username: userTable.username,
  role: userTable.role,
  banned: userTable.banned,
  createdAt: userTable.createdAt,
};

type Row = { id: string; name: string; username: string | null; role: string | null; banned: boolean | null; createdAt: Date };

function toStaffUser(row: Row, lastSeen?: Date | null): StaffUser {
  return {
    id: row.id,
    name: row.name,
    username: row.username ?? "",
    role: toRole(row.role),
    banned: !!row.banned,
    createdAt: row.createdAt.toISOString(),
    ...(lastSeen && { lastSeenAt: lastSeen.toISOString() }),
  };
}

/** Last activity = the most recently refreshed session (refreshed at most daily). */
async function lastSeenByUser(ids: string[]) {
  if (!ids.length) return new Map<string, Date>();
  const rows = await db
    .select({ userId: sessionTable.userId, at: max(sessionTable.updatedAt) })
    .from(sessionTable)
    .where(inArray(sessionTable.userId, ids))
    .groupBy(sessionTable.userId);
  return new Map(rows.filter((r) => r.at).map((r) => [r.userId, new Date(r.at!)]));
}

async function getStaffUser(id: string): Promise<StaffUser> {
  const [row] = await db.select(staffColumns).from(userTable).where(eq(userTable.id, id)).limit(1);
  if (!row) throw notFound("Compte");
  const seen = await lastSeenByUser([id]);
  return toStaffUser(row, seen.get(id));
}

/** Better Auth errors carry English messages; staff see French ones. */
function translate(err: unknown): never {
  if (err instanceof APIError) {
    const code = (err.body as { code?: string } | undefined)?.code ?? "";
    if (code.includes("ALREADY") || code.includes("TAKEN")) {
      throw new AppError("USERNAME_TAKEN", "Cet identifiant est déjà utilisé.", 409);
    }
    if (code.includes("PASSWORD_TOO_SHORT")) throw new AppError("PASSWORD_TOO_SHORT", "Mot de passe trop court (8 caractères minimum).");
    if (code.includes("PASSWORD_TOO_LONG")) throw new AppError("PASSWORD_TOO_LONG", "Mot de passe trop long.");
    if (code.includes("USERNAME")) throw new AppError("INVALID_USERNAME", "Identifiant invalide.");
    if (code.includes("YOURSELF")) throw new AppError("SELF", "Vous ne pouvez pas faire cela sur votre propre compte.");
    if (err.statusCode === 401 || err.statusCode === 403) {
      throw new AppError("FORBIDDEN", "Vous n'avez pas l'autorisation pour cette action.", 403);
    }
  }
  throw err;
}

function assertNotSelf(session: StaffSession, id: string, message: string) {
  if (session.user.id === id) throw new AppError("SELF", message, 409);
}

export async function listStaff(session: StaffSession): Promise<StaffUser[]> {
  assertCan(session, { user: ["list"] });
  // Active accounts first, then by name.
  const rows = await db.select(staffColumns).from(userTable).orderBy(userTable.banned, userTable.name);
  const seen = await lastSeenByUser(rows.map((r) => r.id));
  return rows.map((r) => toStaffUser(r, seen.get(r.id)));
}

/** Active technicians, for assigning repairs (reception and admin). */
export async function listTechnicians(session: StaffSession): Promise<StaffUser[]> {
  assertCan(session, { repair: ["assign"] });
  const rows = await db
    .select(staffColumns)
    .from(userTable)
    .where(and(eq(userTable.role, "technician"), eq(userTable.banned, false)))
    .orderBy(userTable.name);
  return rows.map((r) => toStaffUser(r));
}

export async function createStaff(session: StaffSession, input: StaffUserInput): Promise<StaffUser> {
  assertCan(session, { user: ["create"] });
  const data = staffUserSchema.parse(input);

  const [taken] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.username, data.username))
    .limit(1);
  if (taken) throw new AppError("USERNAME_TAKEN", "Cet identifiant est déjà utilisé.", 409);

  try {
    const { user } = await auth.api.createUser({
      headers: session.headers,
      body: {
        email: placeholderEmail(data.username),
        password: data.password,
        name: data.name,
        role: data.role,
        data: { username: data.username, displayUsername: data.username },
      },
    });
    return getStaffUser(user.id);
  } catch (err) {
    translate(err);
  }
}

export async function updateStaff(session: StaffSession, id: string, input: StaffUpdateInput): Promise<StaffUser> {
  const patch = staffUpdateSchema.parse(input);
  if (patch.role !== undefined) {
    assertCan(session, { user: ["set-role"] });
    // Also guarantees there is always at least one admin: the one acting.
    assertNotSelf(session, id, "Vous ne pouvez pas changer votre propre rôle.");
  }
  if (patch.banned !== undefined) {
    assertCan(session, { user: ["ban"] });
    assertNotSelf(session, id, "Vous ne pouvez pas désactiver votre propre compte.");
  }
  await getStaffUser(id);

  try {
    if (patch.role !== undefined) {
      await auth.api.setRole({ headers: session.headers, body: { userId: id, role: patch.role } });
    }
    if (patch.banned === true) {
      // Banning deletes every session of that user: they are signed out at once.
      await auth.api.banUser({
        headers: session.headers,
        body: { userId: id, banReason: `Désactivé par ${session.user.username}` },
      });
    } else if (patch.banned === false) {
      await auth.api.unbanUser({ headers: session.headers, body: { userId: id } });
    }
  } catch (err) {
    translate(err);
  }
  return getStaffUser(id);
}

/** Admin sets a new password for someone else and signs them out everywhere. */
export async function resetStaffPassword(session: StaffSession, id: string, input: ResetPasswordInput): Promise<void> {
  assertCan(session, { user: ["set-password"], session: ["revoke"] });
  assertNotSelf(session, id, "Pour votre propre compte, utilisez « Changer mon mot de passe ».");
  const { password } = resetPasswordSchema.parse(input);
  await getStaffUser(id);
  try {
    await auth.api.setUserPassword({ headers: session.headers, body: { userId: id, newPassword: password } });
    await auth.api.revokeUserSessions({ headers: session.headers, body: { userId: id } });
  } catch (err) {
    translate(err);
  }
}
