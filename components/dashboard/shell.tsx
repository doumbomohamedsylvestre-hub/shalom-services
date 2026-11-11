"use client";

import { Suspense } from "react";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { SessionProvider } from "@/client/session";
import type { StaffUser } from "@/shared/domain/types";
import { AppSidebar } from "./app-sidebar";
import { OfflineBanner } from "./offline-banner";
import { HeaderSearch } from "./header-search";

/** Back-office shell. `user` comes from the server-validated session (dashboard layout). */
export function DashboardShell({ user, children }: { user: StaffUser; children: React.ReactNode }) {
  return (
    <SessionProvider user={user}>
      <SidebarProvider className="min-h-dvh">
        <AppSidebar />
        <SidebarInset className="min-w-0">
          <OfflineBanner />
          <header className="glass sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 rounded-t-xl border-b px-3 md:px-5">
            <SidebarTrigger className="-ml-1 size-10 md:size-8" />
            <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-5" />
            <HeaderSearch />
          </header>
          <div className="flex flex-1 flex-col gap-6 p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:gap-8 md:p-8">
            <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>{children}</Suspense>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </SessionProvider>
  );
}
