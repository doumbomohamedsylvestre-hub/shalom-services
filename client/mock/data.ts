/**
 * In-memory demo data for the front end, used until the backend is wired.
 * Everything here is fictitious. Only client/api.ts may import this module.
 */
import type {
  AuditEntry,
  Customer,
  Expense,
  ExpenseCategory,
  Inquiry,
  LineItem,
  Payment,
  PaymentMethod,
  Product,
  Repair,
  RepairStatus,
  RepairStatusEvent,
  Sale,
  Service,
  ShopSettings,
  StaffUser,
  StockMovement,
  Supplier,
} from "@/shared/domain/types";

// Deterministic PRNG so the demo looks the same on every load.
let seed = 20261110;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)]!;
const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const round = (n: number, step = 500) => Math.round(n / step) * step;
const NOW = Date.now();
const ago = (hours: number) => new Date(NOW - hours * 3600_000).toISOString();
let idCounter = 1000;
export const newId = (prefix: string) => `${prefix}_${(idCounter++).toString(36)}`;
const CODE_CHARS = "ABCDEFGHJKMNPQRSTVWXYZ23456789";
export const newCode = () => `SS-${Array.from({ length: 6 }, () => pick(CODE_CHARS.split(""))).join("")}`;

export const settings: ShopSettings = {
  name: "Shalom Service",
  address: "Sénou, près du marché",
  city: "Bamako, Mali",
  // Placeholder contact details: replace in Paramètres once the backend is live.
  phones: ["+22370000000", "+22366000000"],
  whatsapp: "+22370000000",
  email: "contact@shalomservice.ml",
  mapUrl: "https://maps.google.com/?q=Sénou,Bamako,Mali",
  mapEmbedUrl: "https://www.google.com/maps?q=S%C3%A9nou%2C%20Bamako%2C%20Mali&output=embed",
  hours: [
    { days: "Lundi – Samedi", open: "08:00", close: "20:00" },
    { days: "Dimanche", open: "10:00", close: "16:00" },
  ],
  terms:
    "Les appareils non récupérés 90 jours après la notification « Prêt » sont considérés comme abandonnés. " +
    "Shalom Service n'est pas responsable des données : pensez à sauvegarder votre téléphone. Le code de " +
    "déverrouillage est demandé uniquement au comptoir et n'est jamais conservé.",
  taxRate: 0,
  prefixes: { sale: "V", invoice: "F" },
  whatsappTemplates: {
    quoteReady:
      "Bonjour {client}, le devis pour votre {appareil} est prêt : {montant}. Répondez OUI pour lancer la réparation. Shalom Service",
    repairReady:
      "Bonjour {client}, votre {appareil} est prêt ! Vous pouvez passer le récupérer. Ticket {code}. Shalom Service",
  },
};

export const services: Service[] = [
  {
    id: "svc_screen",
    slug: "remplacement-ecran",
    name: "Remplacement d'écran",
    summary: "Écran fissuré, tactile qui ne répond plus, taches ou lignes : écran neuf posé et testé.",
    description:
      "Nous remplaçons l'écran (vitre et dalle) avec des pièces de qualité, puis testons le tactile, la luminosité et Face ID / capteur d'empreinte avant de vous rendre l'appareil.",
    priceFrom: 15000,
    durationLabel: "1 à 2 h",
    image: "/assets/service-cards/service-screen-replacement.webp",
    isPublic: true,
    active: true,
    sort: 1,
  },
  {
    id: "svc_battery",
    slug: "remplacement-batterie",
    name: "Remplacement de batterie",
    summary: "Batterie qui gonfle ou se vide en quelques heures : batterie neuve, autonomie retrouvée.",
    description:
      "Diagnostic de l'état de la batterie, remplacement par une batterie neuve et calibrage. Idéal quand le téléphone s'éteint seul ou chauffe.",
    priceFrom: 10000,
    durationLabel: "45 min",
    image: "/assets/service-cards/service-battery-replacement.webp",
    isPublic: true,
    active: true,
    sort: 2,
  },
  {
    id: "svc_port",
    slug: "connecteur-de-charge",
    name: "Connecteur de charge",
    summary: "Le téléphone ne charge plus ou seulement dans une position : nettoyage ou remplacement du port.",
    description:
      "Nettoyage professionnel du connecteur ou remplacement du port de charge USB-C / Lightning, avec test de charge rapide.",
    priceFrom: 7500,
    durationLabel: "1 h",
    image: "/assets/service-cards/service-charging-port-repair.webp",
    isPublic: true,
    active: true,
    sort: 3,
  },
  {
    id: "svc_diag",
    slug: "diagnostic",
    name: "Diagnostic complet",
    summary: "Panne inconnue ? Nous identifions le problème et vous envoyons un devis clair avant toute réparation.",
    description:
      "Contrôle complet de l'appareil : carte mère, alimentation, son, caméras, réseau. Vous recevez un devis détaillé sur WhatsApp et décidez ensuite.",
    priceFrom: 2500,
    durationLabel: "30 min à 24 h",
    image: "/assets/service-cards/service-phone-diagnostics.webp",
    isPublic: true,
    active: true,
    sort: 4,
  },
  {
    id: "svc_software",
    slug: "logiciel-et-mises-a-jour",
    name: "Logiciel & mises à jour",
    summary: "Téléphone lent, bloqué au démarrage ou infecté : mise à jour, réinstallation et optimisation.",
    description:
      "Mise à jour du système, réinstallation propre, suppression de logiciels malveillants et transfert de données entre deux téléphones.",
    priceFrom: 5000,
    durationLabel: "1 à 3 h",
    image: "/assets/service-cards/service-software-update.webp",
    isPublic: true,
    active: true,
    sort: 5,
  },
  {
    id: "svc_tablet",
    slug: "reparation-tablettes",
    name: "Réparation de tablettes",
    summary: "iPad et tablettes Android : écran, batterie, connecteur et logiciel.",
    description: "Les mêmes réparations que pour les smartphones, adaptées aux tablettes et iPad.",
    priceFrom: 20000,
    durationLabel: "Sur devis",
    image: "/assets/services/service-tablet-repair.webp",
    isPublic: true,
    active: true,
    sort: 6,
  },
];

export const staff: StaffUser[] = [
  { id: "usr_admin", name: "Moussa Traoré", username: "admin", role: "admin", banned: false, createdAt: ago(24 * 120), lastSeenAt: ago(0.2) },
  { id: "usr_rec1", name: "Aïssata Coulibaly", username: "aissata", role: "reception", banned: false, createdAt: ago(24 * 90), lastSeenAt: ago(1) },
  { id: "usr_tech1", name: "Ibrahim Diarra", username: "ibrahim", role: "technician", banned: false, createdAt: ago(24 * 80), lastSeenAt: ago(0.5) },
  { id: "usr_tech2", name: "Seydou Keïta", username: "seydou", role: "technician", banned: false, createdAt: ago(24 * 60), lastSeenAt: ago(3) },
  { id: "usr_tech3", name: "Oumar Sangaré", username: "oumar", role: "technician", banned: true, createdAt: ago(24 * 200), lastSeenAt: ago(24 * 40) },
];
const techs = staff.filter((u) => u.role === "technician" && !u.banned);

const FIRST = ["Mamadou", "Fatoumata", "Bakary", "Awa", "Adama", "Kadiatou", "Souleymane", "Mariam", "Boubacar", "Oumou", "Cheick", "Hawa", "Drissa", "Assétou", "Lassina", "Rokia", "Yacouba", "Djeneba", "Modibo", "Salimata"];
const LAST = ["Traoré", "Coulibaly", "Diarra", "Keïta", "Konaté", "Sidibé", "Touré", "Dembélé", "Camara", "Sangaré", "Maïga", "Diallo", "Cissé", "Doumbia"];

export const customers: Customer[] = Array.from({ length: 28 }, (_, i) => ({
  id: `cus_${i + 1}`,
  name: `${pick(FIRST)} ${pick(LAST)}`,
  phone: `+223${pick(["70", "76", "66", "65", "79", "90", "77"])}${String(int(100000, 999999))}`,
  notes: i % 7 === 0 ? "Client fidèle, préfère être contacté sur WhatsApp." : undefined,
  createdAt: ago(int(24, 24 * 150)),
  repairsCount: 0,
  totalSpent: 0,
}));

export const productCategories = ["Écrans", "Batteries", "Connecteurs", "Coques & protections", "Chargeurs & câbles", "Audio", "Téléphones"];

export const products: Product[] = [
  ["ECR-IP11", "Écran iPhone 11", "part", "Écrans", 35000, 22000, 6, 3],
  ["ECR-IP12", "Écran iPhone 12 / 12 Pro", "part", "Écrans", 55000, 36000, 2, 3],
  ["ECR-IP13", "Écran iPhone 13", "part", "Écrans", 65000, 43000, 4, 2],
  ["ECR-A14", "Écran Samsung Galaxy A14", "part", "Écrans", 25000, 15500, 9, 4],
  ["ECR-A34", "Écran Samsung Galaxy A34", "part", "Écrans", 38000, 24000, 3, 3],
  ["ECR-TS16", "Écran Tecno Spark 10", "part", "Écrans", 18000, 10500, 11, 4],
  ["ECR-RN12", "Écran Xiaomi Redmi Note 12", "part", "Écrans", 28000, 17000, 0, 2],
  ["BAT-IP11", "Batterie iPhone 11", "part", "Batteries", 18000, 9500, 8, 4],
  ["BAT-IP12", "Batterie iPhone 12", "part", "Batteries", 20000, 11000, 5, 3],
  ["BAT-A14", "Batterie Samsung A14", "part", "Batteries", 12000, 6500, 12, 5],
  ["BAT-ITL", "Batterie Itel A70", "part", "Batteries", 8000, 4000, 2, 4],
  ["CNX-USBC", "Connecteur USB-C universel", "part", "Connecteurs", 5000, 1800, 25, 10],
  ["CNX-LGT", "Connecteur Lightning iPhone", "part", "Connecteurs", 9000, 4200, 7, 5],
  ["COQ-SIL", "Coque silicone (assortiment)", "accessory", "Coques & protections", 3000, 1000, 64, 20],
  ["VTR-TMP", "Verre trempé 9H", "accessory", "Coques & protections", 2000, 500, 140, 40],
  ["CHG-20W", "Chargeur rapide 20 W USB-C", "accessory", "Chargeurs & câbles", 7500, 3800, 18, 8],
  ["CBL-USBC", "Câble USB-C 1 m", "accessory", "Chargeurs & câbles", 2500, 900, 45, 15],
  ["CBL-LGT", "Câble Lightning 1 m", "accessory", "Chargeurs & câbles", 3500, 1300, 6, 10],
  ["PWB-10K", "Batterie externe 10 000 mAh", "accessory", "Chargeurs & câbles", 12000, 7000, 9, 4],
  ["AUD-EAR", "Écouteurs filaires", "accessory", "Audio", 2500, 900, 30, 10],
  ["AUD-BT", "Écouteurs Bluetooth", "accessory", "Audio", 15000, 8500, 7, 4],
  ["TEL-A05", "Samsung Galaxy A05 64 Go", "phone", "Téléphones", 75000, 61000, 3, 2],
  ["TEL-SP10", "Tecno Spark 10 128 Go", "phone", "Téléphones", 85000, 69000, 4, 2],
  ["TEL-ITA70", "Itel A70 64 Go", "phone", "Téléphones", 48000, 39000, 1, 2],
].map(([sku, name, kind, category, salePrice, avgCost, qty, min], i) => ({
  id: `prd_${i + 1}`,
  sku: sku as string,
  name: name as string,
  kind: kind as Product["kind"],
  category: category as string,
  salePrice: salePrice as number,
  avgCost: avgCost as number,
  qtyOnHand: qty as number,
  minQty: min as number,
  active: true,
}));

export const suppliers: Supplier[] = [
  { id: "sup_1", name: "Bamako Pièces Mobiles", phone: "+22376000001", contact: "M. Konaté", receiptsCount: 14, lastReceiptAt: ago(24 * 3) },
  { id: "sup_2", name: "Grand Marché Télécom", phone: "+22366000002", contact: "Mme Sidibé", receiptsCount: 9, lastReceiptAt: ago(24 * 11) },
  { id: "sup_3", name: "Dakar Phone Import", phone: "+221770000003", contact: "M. Ndiaye", notes: "Livraison par bus, 3 à 5 jours.", receiptsCount: 4, lastReceiptAt: ago(24 * 26) },
  { id: "sup_4", name: "Accessoires Express", phone: "+22379000004", receiptsCount: 6, lastReceiptAt: ago(24 * 7) },
];

const DEVICES: [string, string][] = [
  ["Apple", "iPhone 11"], ["Apple", "iPhone 12"], ["Apple", "iPhone 13 Pro"], ["Apple", "iPhone XR"],
  ["Samsung", "Galaxy A14"], ["Samsung", "Galaxy A34"], ["Samsung", "Galaxy S21"],
  ["Tecno", "Spark 10"], ["Tecno", "Camon 20"], ["Infinix", "Hot 30"], ["Itel", "A70"], ["Xiaomi", "Redmi Note 12"],
];
const FAULTS: [string, string, number][] = [
  ["Écran cassé, tactile ne répond plus en bas", "Remplacement d'écran", 35000],
  ["Batterie se vide en 2 heures, chauffe", "Remplacement de batterie", 18000],
  ["Ne charge plus, câble doit être tenu", "Remplacement connecteur de charge", 9000],
  ["Téléphone tombé dans l'eau, ne s'allume plus", "Diagnostic + nettoyage carte mère", 15000],
  ["Bloqué sur le logo au démarrage", "Réinstallation logiciel", 7500],
  ["Pas de son pendant les appels", "Remplacement haut-parleur", 8000],
  ["Caméra arrière floue", "Remplacement caméra arrière", 22000],
];
const COLORS = ["Noir", "Bleu", "Blanc", "Vert", "Violet", "Or"];
const METHODS: PaymentMethod[] = ["cash", "cash", "cash", "orange_money", "orange_money", "moov_money"];

function buildEvents(path: RepairStatus[], start: number, techName: string): RepairStatusEvent[] {
  let t = start;
  return path.map((to, i) => {
    const ev: RepairStatusEvent = {
      id: newId("evt"),
      from: i === 0 ? null : path[i - 1]!,
      to,
      by: i === 0 ? "Aïssata Coulibaly" : ["quote_sent", "approved", "refused", "picked_up"].includes(to) ? "Aïssata Coulibaly" : techName,
      at: ago(t),
      note: to === "quote_sent" ? "Devis envoyé par WhatsApp." : undefined,
    };
    t = Math.max(0.2, t - rand() * 8 - 1);
    return ev;
  });
}

const STATUS_PATHS: { mode: "fixed" | "quote"; path: RepairStatus[] }[] = [
  { mode: "fixed", path: ["received"] },
  { mode: "fixed", path: ["received", "in_repair"] },
  { mode: "fixed", path: ["received", "in_repair", "ready"] },
  { mode: "fixed", path: ["received", "in_repair", "ready", "picked_up"] },
  { mode: "fixed", path: ["received", "in_repair", "ready", "picked_up"] },
  { mode: "quote", path: ["received"] },
  { mode: "quote", path: ["received", "diagnosing"] },
  { mode: "quote", path: ["received", "diagnosing", "quote_sent"] },
  { mode: "quote", path: ["received", "diagnosing", "quote_sent", "approved", "in_repair"] },
  { mode: "quote", path: ["received", "diagnosing", "quote_sent", "approved", "waiting_parts"] },
  { mode: "quote", path: ["received", "diagnosing", "quote_sent", "approved", "in_repair", "ready"] },
  { mode: "quote", path: ["received", "diagnosing", "quote_sent", "approved", "in_repair", "ready", "picked_up"] },
  { mode: "quote", path: ["received", "diagnosing", "quote_sent", "refused", "returned_unrepaired"] },
  { mode: "quote", path: ["received", "diagnosing", "unrepairable"] },
];

export const repairs: Repair[] = Array.from({ length: 42 }, (_, i) => {
  const customer = customers[i % customers.length]!;
  const [brand, model] = pick(DEVICES);
  const [fault, service, price] = pick(FAULTS);
  const { mode, path } = STATUS_PATHS[i % STATUS_PATHS.length]!;
  const status = path[path.length - 1]!;
  const unclaimed = (status === "received" || status === "diagnosing") && i % 3 === 0;
  const tech = unclaimed ? undefined : pick(techs);
  const start = i < 8 ? int(2, 30) : int(30, 24 * 40);
  const hasQuote = mode === "fixed" || path.includes("quote_sent");
  const lines: LineItem[] = hasQuote
    ? [
        { id: newId("lin"), kind: "service", refId: "svc_x", label: service, qty: 1, unitPrice: round(price * (0.85 + rand() * 0.4)), discount: i % 9 === 0 ? 2000 : 0, discountBy: i % 9 === 0 ? "Aïssata Coulibaly" : undefined },
      ]
    : [];
  const total = lines.reduce((s, l) => s + l.qty * l.unitPrice - l.discount, 0);
  const payments: Payment[] = [];
  if (i % 4 === 0 && total > 0) {
    payments.push({ id: newId("pay"), amount: round(total * 0.3, 1000), method: "cash", kind: "deposit", receivedBy: "Aïssata Coulibaly", at: ago(start) });
  }
  if (status === "picked_up") {
    const paid = payments.reduce((s, p) => s + p.amount, 0);
    payments.push({ id: newId("pay"), amount: total - paid, method: pick(METHODS), kind: "payment", receivedBy: "Aïssata Coulibaly", at: ago(Math.max(0.5, start - 20)) });
  }
  const events = buildEvents(path, start, tech?.name ?? "Ibrahim Diarra");
  return {
    id: `rep_${i + 1}`,
    code: newCode(),
    customer: { id: customer.id, name: customer.name, phone: customer.phone },
    device: { brand, model, color: pick(COLORS), imei: i % 3 === 0 ? `35${int(1000000, 9999999)}${int(100000, 999999)}` : undefined },
    fault,
    conditionNotes: i % 2 === 0 ? "Rayures légères sur la coque arrière." : undefined,
    accessories: i % 5 === 0 ? "Coque laissée avec l'appareil" : undefined,
    diagnosis: path.includes("quote_sent") || status === "unrepairable" ? `Constat : ${service.toLowerCase()} nécessaire.` : undefined,
    mode,
    status,
    technician: tech ? { id: tech.id, name: tech.name } : undefined,
    lines,
    payments,
    events,
    estimatedReadyAt: ["picked_up", "cancelled", "returned_unrepaired", "unrepairable"].includes(status)
      ? undefined
      : new Date(NOW + (i % 5 === 0 ? -1 : 1) * int(2, 48) * 3600_000).toISOString(),
    createdAt: events[0]!.at,
    updatedAt: events[events.length - 1]!.at,
  };
});

for (const c of customers) {
  const mine = repairs.filter((r) => r.customer.id === c.id);
  c.repairsCount = mine.length;
  c.totalSpent = mine.flatMap((r) => r.payments).reduce((s, p) => s + p.amount, 0);
}

export const sales: Sale[] = Array.from({ length: 36 }, (_, i) => {
  const items = Array.from({ length: int(1, 3) }, () => pick(products.filter((p) => p.kind !== "part")));
  const lines: LineItem[] = items.map((p) => ({
    id: newId("lin"),
    kind: "product",
    refId: p.id,
    label: p.name,
    qty: p.kind === "phone" ? 1 : int(1, 2),
    unitPrice: p.salePrice,
    discount: i % 6 === 0 ? 500 : 0,
    discountBy: i % 6 === 0 ? "Aïssata Coulibaly" : undefined,
  }));
  const total = lines.reduce((s, l) => s + l.qty * l.unitPrice - l.discount, 0);
  const at = ago(i * 17 + int(1, 10));
  const customer = i % 3 === 0 ? customers[i % customers.length] : undefined;
  return {
    id: `sal_${i + 1}`,
    number: `V-${String(1240 - i).padStart(5, "0")}`,
    customer: customer ? { id: customer.id, name: customer.name, phone: customer.phone } : undefined,
    lines,
    payments: [{ id: newId("pay"), amount: total, method: pick(METHODS), kind: "payment", receivedBy: "Aïssata Coulibaly", at }],
    soldBy: i % 4 === 0 ? "Moussa Traoré" : "Aïssata Coulibaly",
    at,
    voided: i === 5 ? { at: ago(i * 17), by: "Moussa Traoré", reason: "Erreur de saisie, vente enregistrée deux fois." } : undefined,
  };
});

export const expenseCategories: ExpenseCategory[] = [
  { id: "exc_rent", name: "Loyer" },
  { id: "exc_power", name: "Électricité" },
  { id: "exc_salary", name: "Salaires" },
  { id: "exc_transport", name: "Transport" },
  { id: "exc_internet", name: "Internet & téléphone" },
  { id: "exc_supplies", name: "Petit matériel" },
];

export const expenses: Expense[] = [
  ...[0, 1, 2].map((m) => ({ cat: "exc_rent", amount: 150000, day: m * 30 + 1 })),
  ...[0, 1, 2].map((m) => ({ cat: "exc_salary", amount: 240000, day: m * 30 + 2 })),
  ...[0, 1, 2].map((m) => ({ cat: "exc_power", amount: int(28000, 42000), day: m * 30 + 6 })),
  ...[0, 1, 2].map((m) => ({ cat: "exc_internet", amount: 25000, day: m * 30 + 4 })),
  ...Array.from({ length: 10 }, (_, i) => ({ cat: pick(["exc_transport", "exc_supplies"]), amount: round(int(1500, 18000)), day: i * 8 + 1 })),
]
  .sort((a, b) => a.day - b.day)
  .map((e, i) => ({
    id: `exp_${i + 1}`,
    date: ago(e.day * 24),
    category: expenseCategories.find((c) => c.id === e.cat)!,
    amount: e.amount,
    method: e.cat === "exc_salary" ? "orange_money" : "cash",
    note: e.cat === "exc_transport" ? "Taxi pour récupérer des pièces" : e.cat === "exc_supplies" ? "Colle B-7000, tournevis" : undefined,
    createdBy: e.cat === "exc_salary" || e.cat === "exc_rent" ? "Moussa Traoré" : "Aïssata Coulibaly",
    voided: i === 7 ? { at: ago(e.day * 24 - 2), by: "Moussa Traoré", reason: "Montant erroné." } : undefined,
  }));

export const inquiries: Inquiry[] = [
  { id: "inq_1", type: "quote", name: "Kadiatou Maïga", phone: "+22376112233", device: "iPhone 12", message: "Bonjour, mon écran est fissuré et il y a des lignes vertes. Combien pour le changer ?", status: "new", createdAt: ago(0.6) },
  { id: "inq_2", type: "repair", name: "Adama Cissé", phone: "+22366445566", device: "Samsung A34", message: "Le téléphone ne charge plus depuis hier. Je peux passer cet après-midi ?", status: "new", createdAt: ago(2.5) },
  { id: "inq_3", type: "contact", name: "Rokia Dembélé", phone: "+22379887766", message: "Est-ce que vous vendez des coques pour Tecno Camon 20 ?", status: "contacted", createdAt: ago(20) },
  { id: "inq_4", type: "quote", name: "Yacouba Touré", phone: "+22370998877", device: "Infinix Hot 30", message: "Batterie qui gonfle, le dos se décolle.", status: "converted", convertedRepairCode: repairs[3]!.code, createdAt: ago(48) },
  { id: "inq_5", type: "repair", name: "Hawa Konaté", phone: "+22365123987", device: "iPhone XR", message: "Face ID ne fonctionne plus après une chute.", status: "new", createdAt: ago(5) },
  { id: "inq_6", type: "contact", name: "Drissa Camara", phone: "+22377665544", message: "Vous êtes ouverts le dimanche ?", status: "closed", createdAt: ago(96) },
];

export const movements: StockMovement[] = products.slice(0, 14).flatMap((p, i) => [
  { id: newId("mov"), productId: p.id, productName: p.name, type: "receipt" as const, qtyDelta: int(5, 20), unitCost: p.avgCost, ref: `Réception ${suppliers[i % suppliers.length]!.name}`, by: "Moussa Traoré", at: ago(24 * int(5, 30)) },
  { id: newId("mov"), productId: p.id, productName: p.name, type: (p.kind === "part" ? "repair_use" : "sale") as StockMovement["type"], qtyDelta: -int(1, 3), unitCost: p.avgCost, ref: p.kind === "part" ? repairs[i]!.code : sales[i]!.number, by: "Ibrahim Diarra", at: ago(24 * int(0, 4)) },
  ...(i % 5 === 0 ? [{ id: newId("mov"), productId: p.id, productName: p.name, type: "adjustment" as const, qtyDelta: -1, unitCost: p.avgCost, by: "Moussa Traoré", at: ago(24 * 2), reason: "Pièce défectueuse à la réception" }] : []),
]).sort((a, b) => b.at.localeCompare(a.at));

export const audit: AuditEntry[] = [
  { id: "aud_1", actor: "Moussa Traoré", action: "void", entity: "Vente", entityRef: sales[5]!.number, summary: "Vente annulée : erreur de saisie.", at: ago(85) },
  { id: "aud_2", actor: "Aïssata Coulibaly", action: "create", entity: "Paiement", entityRef: repairs[3]!.code, summary: "Paiement de 12 000 FCFA (Orange Money).", at: ago(3) },
  { id: "aud_3", actor: "Moussa Traoré", action: "adjust", entity: "Stock", entityRef: "ECR-IP11", summary: "Ajustement −1 : pièce défectueuse.", at: ago(48) },
  { id: "aud_4", actor: "Aïssata Coulibaly", action: "discount", entity: "Réparation", entityRef: repairs[9]!.code, summary: "Remise de 2 000 FCFA accordée.", at: ago(30) },
  { id: "aud_5", actor: "Moussa Traoré", action: "ban", entity: "Utilisateur", entityRef: "oumar", summary: "Compte désactivé.", at: ago(24 * 40) },
  { id: "aud_6", actor: "Moussa Traoré", action: "void", entity: "Dépense", entityRef: expenses[7]!.id, summary: "Dépense annulée : montant erroné.", at: ago(24 * 9) },
];
