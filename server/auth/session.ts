import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { roles, type Role } from "@/shared/auth/permissions";
import type { StaffUser } from "@/shared/domain/types";
import { ROUTES } from "@/shared/site";
import { forbidden, unauthorized } from "../errors";
import { auth } from "./auth";

/**
 * The server's view of who is calling. Every service function takes one,
 * so authorization is checked in one place (`assertCan`).
 */
export type StaffSession = {
  user: StaffUser;
  /** Request headers, forwarded to Better Auth's own APIs (cookies). */
  headers: Headers;
};

type Statements = Parameters<(typeof roles)["admin"]["authorize"]>[0];

export function toRole(value: string | null | undefined): Role {
  return value === "admin" || value === "reception" || value === "technician" ? value : "technician";
}

/** Reads and validates the session cookie against the database. Null when signed out. */
export async function getStaffSession(): Promise<StaffSession | null> {
  const h = await headers();
  const result = await auth.api.getSession({ headers: h });
  if (!result || result.user.banned) return null;
  const u = result.user;
  return {
    headers: h,
    user: {
      id: u.id,
      name: u.name,
      username: u.username ?? "",
      role: toRole(u.role),
      banned: false,
      createdAt: new Date(u.createdAt).toISOString(),
    },
  };
}

/** For route handlers: the session, or a 401 AppError. */
export async function requireSession(): Promise<StaffSession> {
  const session = await getStaffSession();
  if (!session) throw unauthorized();
  return session;
}

/** For pages and layouts: the session, or a redirect to the login page. */
export async function requireStaffPage(next?: string): Promise<StaffSession> {
  const session = await getStaffSession();
  if (!session) redirect(next ? `${ROUTES.login}?next=${encodeURIComponent(next)}` : ROUTES.login);
  return session;
}

export function can(session: StaffSession, permissions: Statements) {
  return roles[session.user.role].authorize(permissions).success;
}

/** Throws a 403 AppError unless the role grants every listed permission. */
export function assertCan(session: StaffSession, permissions: Statements) {
  if (!can(session, permissions)) throw forbidden();
}
