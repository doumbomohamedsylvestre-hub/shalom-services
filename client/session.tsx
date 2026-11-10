"use client";

/**
 * DEMO session for the front end, until Better Auth is wired.
 *
 * Integration: replace the provider body with `authClient.useSession()`
 * (lib/auth-client.ts) and keep the same `useSession()` return shape, so
 * screens and navigation keep working unchanged. `can()` already uses the
 * real permission map from shared/auth/permissions.ts.
 */
import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { roles, type Role } from "@/shared/auth/permissions";
import type { StaffUser } from "@/shared/domain/types";

const DEMO_USERS: Record<Role, StaffUser> = {
  admin: { id: "usr_admin", name: "Moussa Traoré", username: "admin", role: "admin", banned: false, createdAt: "" },
  reception: { id: "usr_rec1", name: "Aïssata Coulibaly", username: "aissata", role: "reception", banned: false, createdAt: "" },
  technician: { id: "usr_tech1", name: "Ibrahim Diarra", username: "ibrahim", role: "technician", banned: false, createdAt: "" },
};

type Statements = Parameters<(typeof roles)["admin"]["authorize"]>[0];

type SessionValue = {
  user: StaffUser;
  can: (permissions: Statements) => boolean;
  setDemoRole: (role: Role) => void;
};

const KEY = "shalom.demoRole";
const listeners = new Set<() => void>();
function readRole(): Role {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "admin" || v === "reception" || v === "technician") return v;
  } catch {}
  return "admin";
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const role = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    readRole,
    () => "admin" as Role,
  );
  const setDemoRole = useCallback((r: Role) => {
    try {
      localStorage.setItem(KEY, r);
    } catch {}
    listeners.forEach((l) => l());
  }, []);
  const value = useMemo<SessionValue>(
    () => ({
      user: DEMO_USERS[role],
      can: (p) => roles[role].authorize(p).success,
      setDemoRole,
    }),
    [role, setDemoRole],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}
