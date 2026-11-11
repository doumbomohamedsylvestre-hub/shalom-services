import { randomUUID } from "node:crypto";
import type { StaffSession } from "@/server/auth/session";
import type { Role } from "@/shared/auth/permissions";

export const hasDb = !!process.env.DATABASE_URL;

/** Creates a throwaway staff account on the test branch and returns a service session for it. */
export async function staff(role: Role, name = `Test ${role}`): Promise<StaffSession> {
  const { db } = await import("@/server/db/client");
  const { user } = await import("@/server/db/schema");
  const id = `test-${randomUUID()}`;
  const username = `t${id.slice(5, 17).replace(/-/g, "")}`;
  await db.insert(user).values({ id, name, email: `${username}@staff.invalid`, username, role });
  return { user: { id, name, username, role, banned: false, createdAt: new Date().toISOString() }, headers: new Headers() };
}

/** Unique values so repeated runs never collide on unique columns. */
export const uniq = () => randomUUID().slice(0, 8).toUpperCase();
export const phone = () => `7${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;

export async function expectAppError(p: Promise<unknown>, code: string) {
  const { AppError } = await import("@/server/errors");
  try {
    await p;
  } catch (e) {
    if (e instanceof AppError && e.code === code) return e;
    throw new Error(`expected AppError ${code}, got ${e instanceof AppError ? e.code : String(e)}`);
  }
  throw new Error(`expected AppError ${code}, but it resolved`);
}
