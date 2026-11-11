/**
 * Static brand identity. Business contact details (phones, hours, address)
 * are NOT here: they live in `shop_settings` and reach the UI through
 * `ShopSettings` (see shared/domain/types.ts), so the owner can edit them.
 */
export const SITE = {
  name: "Shalom Service",
  tagline: "Réparation • Entretien • Accessoires",
  description:
    "Réparation, entretien et accessoires pour smartphones et tablettes à Sénou, Bamako. Diagnostic rapide, devis clair, suivi de votre réparation en ligne.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://shalom-services-mali.vercel.app",
} as const;

export const ROUTES = {
  home: "/",
  services: "/services",
  about: "/a-propos",
  contact: "/contact",
  quote: "/devis",
  tracking: "/suivi",
  login: "/connexion",
  dashboard: "/tableau-de-bord",
} as const;
