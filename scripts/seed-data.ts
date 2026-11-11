// Starting data for `npm run db:seed` (taken from the approved demo content).
// Reference data (services, categories) is seeded everywhere; the sample
// catalogue (products, suppliers) only when SEED_SAMPLE_CATALOG=1.

export const EXPENSE_CATEGORIES = ["Loyer", "Salaires", "Électricité", "Internet & téléphone", "Transport", "Petit matériel"];

export const SERVICES = [
  {
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
] as const;

export const PRODUCT_CATEGORIES = ["Écrans", "Batteries", "Connecteurs", "Coques & protections", "Chargeurs & câbles", "Audio", "Téléphones"];

export const SAMPLE_PRODUCTS: [string, string, "part" | "accessory" | "phone", string, number, number, number, number][] = [
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
]; // sku, name, kind, category, salePrice, avgCost, qty, minQty

export const SAMPLE_SUPPLIERS: { name: string; phone?: string; contact?: string; notes?: string }[] = [
  { name: "Bamako Pièces Mobiles", phone: "+22376000001", contact: "M. Konaté" },
  { name: "Grand Marché Télécom", phone: "+22366000002", contact: "Mme Sidibé" },
  { name: "Dakar Phone Import", phone: "+221770000003", contact: "M. Ndiaye", notes: "Livraison par bus, 3 à 5 jours." },
  { name: "Accessoires Express", phone: "+22379000004" },
];
