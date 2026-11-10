"use client";

import { ChevronsUpDownIcon, ExternalLinkIcon, LogOutIcon, UserRoundCogIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { useDashboardSummary } from "@/client/hooks";
import { useSession } from "@/client/session";
import { ROLE_LABELS, type Role } from "@/shared/auth/permissions";
import { initials } from "@/shared/format";
import { ROUTES } from "@/shared/site";
import { NAV_GROUPS } from "./nav";

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, can, setDemoRole } = useSession();
  const { setOpenMobile } = useSidebar();
  const summary = useDashboardSummary();

  const isActive = (href: string) => (href === ROUTES.dashboard ? pathname === href : pathname.startsWith(href));

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="px-3 pt-4 pb-2">
        <Logo size="sm" href={ROUTES.dashboard} className="group-data-[collapsible=icon]:[&>span:last-child]:hidden" />
      </SidebarHeader>
      <SidebarContent>
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter((i) => !i.permission || can(i.permission));
          if (!items.length) return null;
          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => {
                    const count =
                      item.badge === "inquiries" ? summary.data?.newInquiries : item.badge === "unclaimed" ? summary.data?.unclaimed : 0;
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          isActive={isActive(item.href)}
                          tooltip={item.label}
                          render={<Link href={item.href} onClick={() => setOpenMobile(false)} />}
                          className="h-10 md:h-8"
                        >
                          <item.icon />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                        {!!count && <SidebarMenuBadge className="rounded-full bg-brand/15 text-[color-mix(in_oklch,var(--brand),black_20%)]">{count}</SidebarMenuBadge>}
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger render={<SidebarMenuButton size="lg" className="data-popup-open:bg-sidebar-accent" />}>
                <Avatar className="size-8 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-primary text-xs text-primary-foreground">{initials(user.name)}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</span>
                </div>
                <ChevronsUpDownIcon className="ml-auto size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-64">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Aperçu par rôle (démo, avant l&apos;authentification)
                  </DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={user.role} onValueChange={(v) => setDemoRole(v as Role)}>
                    {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                      <DropdownMenuRadioItem key={r} value={r}>
                        <UserRoundCogIcon />
                        {ROLE_LABELS[r]}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link href={ROUTES.home} target="_blank" />}>
                  <ExternalLinkIcon />
                  Voir le site public
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={() => router.push(ROUTES.login)}>
                  <LogOutIcon />
                  Se déconnecter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
