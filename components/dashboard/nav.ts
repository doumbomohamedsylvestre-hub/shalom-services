import {
  BarChart3Icon,
  BoxesIcon,
  HistoryIcon,
  InboxIcon,
  LayoutDashboardIcon,
  type LucideIcon,
  ReceiptIcon,
  SettingsIcon,
  ShoppingBagIcon,
  TruckIcon,
  UsersIcon,
  UserCogIcon,
  WrenchIcon,
} from "lucide-react";
import type { statements } from "@/shared/auth/permissions";

type Perm = { [K in keyof typeof statements]?: (typeof statements)[K][number][] };

export type NavItem = { href: string; label: string; icon: LucideIcon; permission?: Perm; badge?: "inquiries" | "unclaimed" };

const D = "/tableau-de-bord";

export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Atelier",
    items: [
      { href: D, label: "Vue d'ensemble", icon: LayoutDashboardIcon },
      { href: `${D}/reparations`, label: "Réparations", icon: WrenchIcon, permission: { repair: ["read"] }, badge: "unclaimed" },
      { href: `${D}/clients`, label: "Clients", icon: UsersIcon, permission: { customer: ["read"] } },
      { href: `${D}/demandes`, label: "Demandes", icon: InboxIcon, permission: { inquiry: ["read"] }, badge: "inquiries" },
    ],
  },
  {
    label: "Boutique",
    items: [
      { href: `${D}/ventes`, label: "Ventes", icon: ShoppingBagIcon, permission: { sale: ["read"] } },
      { href: `${D}/stock`, label: "Stock", icon: BoxesIcon, permission: { inventory: ["read"] } },
      { href: `${D}/fournisseurs`, label: "Fournisseurs", icon: TruckIcon, permission: { supplier: ["read"] } },
      { href: `${D}/depenses`, label: "Dépenses", icon: ReceiptIcon, permission: { expense: ["create"] } },
    ],
  },
  {
    label: "Gestion",
    items: [
      { href: `${D}/rapports`, label: "Rapports", icon: BarChart3Icon, permission: { report: ["read"] } },
      { href: `${D}/utilisateurs`, label: "Équipe", icon: UserCogIcon, permission: { user: ["list"] } },
      { href: `${D}/journal`, label: "Journal", icon: HistoryIcon, permission: { audit: ["read"] } },
      { href: `${D}/parametres`, label: "Paramètres", icon: SettingsIcon, permission: { settings: ["update"] } },
    ],
  },
];
