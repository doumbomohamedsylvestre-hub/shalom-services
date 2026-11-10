import { ROUTES } from "@/shared/site";

export const PUBLIC_NAV = [
  { href: ROUTES.home, label: "Accueil" },
  { href: ROUTES.services, label: "Services" },
  { href: ROUTES.about, label: "À propos" },
  { href: ROUTES.tracking, label: "Suivi" },
  { href: ROUTES.contact, label: "Contact" },
] as const;
