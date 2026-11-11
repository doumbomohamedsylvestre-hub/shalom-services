import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardShell } from "@/components/dashboard/shell";
import { Skeleton } from "@/components/ui/skeleton";
import { requireStaffPage } from "@/server/auth/session";
import { ROUTES } from "@/shared/site";

export const metadata: Metadata = {
  title: { default: "Tableau de bord", template: "%s | Shalom Service" },
  robots: { index: false, follow: false },
};

/**
 * The back office is per-user: the session is read at request time, so the
 * shell streams in behind a static skeleton. Signed-out or deactivated staff
 * are sent to the login page before anything renders.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </Suspense>
  );
}

async function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const { user } = await requireStaffPage(ROUTES.dashboard);
  return <DashboardShell user={user}>{children}</DashboardShell>;
}

function ShellSkeleton() {
  return (
    <div className="flex min-h-dvh bg-sidebar">
      <div className="hidden w-64 flex-col gap-3 p-4 md:flex">
        <Skeleton className="h-8 w-40" />
        {Array.from({ length: 9 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
      <div className="m-2 flex flex-1 flex-col gap-6 rounded-xl bg-background p-8">
        <Skeleton className="h-9 w-64" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </div>
  );
}
