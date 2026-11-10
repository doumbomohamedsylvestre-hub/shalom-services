import type {
  InquiryStatus,
  InquiryType,
  PaymentMethod,
  ProductKind,
  RepairMode,
  RepairStatus,
  StockMovementType,
} from "./types";

/** Visual tone for status chips; maps to semantic tokens in StatusBadge. */
export type Tone = "neutral" | "info" | "warning" | "success" | "danger" | "brand";

export const REPAIR_STATUS: Record<RepairStatus, { label: string; tone: Tone; publicLabel: string }> = {
  received: { label: "Reçu", tone: "neutral", publicLabel: "Appareil reçu" },
  diagnosing: { label: "Diagnostic", tone: "info", publicLabel: "Diagnostic en cours" },
  quote_sent: { label: "Devis envoyé", tone: "brand", publicLabel: "Devis envoyé, en attente de votre accord" },
  approved: { label: "Devis accepté", tone: "info", publicLabel: "Devis accepté" },
  refused: { label: "Devis refusé", tone: "danger", publicLabel: "Devis refusé" },
  in_repair: { label: "En réparation", tone: "info", publicLabel: "Réparation en cours" },
  waiting_parts: { label: "Attente pièces", tone: "warning", publicLabel: "En attente de pièces" },
  ready: { label: "Prêt", tone: "success", publicLabel: "Prêt à être récupéré" },
  picked_up: { label: "Récupéré", tone: "neutral", publicLabel: "Récupéré" },
  unrepairable: { label: "Irréparable", tone: "danger", publicLabel: "Réparation impossible" },
  returned_unrepaired: { label: "Rendu non réparé", tone: "neutral", publicLabel: "Rendu sans réparation" },
  cancelled: { label: "Annulé", tone: "neutral", publicLabel: "Annulé" },
};

export const REPAIR_MODE: Record<RepairMode, { label: string; description: string }> = {
  fixed: { label: "Prix fixe", description: "Le prix est convenu au comptoir." },
  quote: { label: "Sur devis", description: "Diagnostic d'abord, puis devis à valider par le client." },
};

/** Statuses that count as "open" work in lists and dashboards. */
export const OPEN_STATUSES: RepairStatus[] = [
  "received",
  "diagnosing",
  "quote_sent",
  "approved",
  "in_repair",
  "waiting_parts",
  "ready",
];

export const PAYMENT_METHOD: Record<PaymentMethod, string> = {
  cash: "Espèces",
  orange_money: "Orange Money",
  moov_money: "Moov Money",
  bank: "Virement bancaire",
};

export const PRODUCT_KIND: Record<ProductKind, string> = {
  part: "Pièce détachée",
  accessory: "Accessoire",
  phone: "Téléphone",
};

export const STOCK_MOVEMENT: Record<StockMovementType, { label: string; tone: Tone }> = {
  receipt: { label: "Réception", tone: "success" },
  sale: { label: "Vente", tone: "info" },
  repair_use: { label: "Réparation", tone: "brand" },
  adjustment: { label: "Ajustement", tone: "warning" },
  void: { label: "Annulation", tone: "danger" },
};

export const INQUIRY_TYPE: Record<InquiryType, string> = {
  repair: "Réparation",
  quote: "Demande de devis",
  contact: "Message",
};

export const INQUIRY_STATUS: Record<InquiryStatus, { label: string; tone: Tone }> = {
  new: { label: "Nouveau", tone: "brand" },
  contacted: { label: "Contacté", tone: "info" },
  converted: { label: "Converti", tone: "success" },
  closed: { label: "Clôturé", tone: "neutral" },
};
