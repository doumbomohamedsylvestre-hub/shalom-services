"use client";

/**
 * The signed-in staff member, for client components.
 *
 * The dashboard layout validates the session on the server (Better Auth,
 * server/auth/session.ts) and passes the user in, so `useSession()` never
 * has a loading state. `can()` uses the same permission map as the server's
 * `assertCan`; it only hides UI, the API enforces it again.
 */
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { setMockActor } from "@/client/api";
import { authClient } from "@/lib/auth-client";
import { roles } from "@/shared/auth/permissions";
import type { StaffUser } from "@/shared/domain/types";
import { ROUTES } from "@/shared/site";

type Statements = Parameters<(typeof roles)["admin"]["authorize"]>[0];

type SessionValue = {
  user: StaffUser;
  can: (permissions: Statements) => boolean;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ user, children }: { user: StaffUser; children: React.ReactNode }) {
  const router = useRouter();
  useEffect(() => setMockActor(user.name), [user.name]);

  const signOut = useCallback(async () => {
    const { error } = await authClient.signOut();
    if (error) throw new Error(error.message ?? "sign-out failed");
    router.replace(ROUTES.login);
    router.refresh();
  }, [router]);

  const value = useMemo<SessionValue>(
    () => ({ user, can: (p) => roles[user.role].authorize(p).success, signOut }),
    [user, signOut],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}
