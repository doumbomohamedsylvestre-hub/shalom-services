import { z } from "zod";
import { amountXOF, maliPhone, optionalText, paymentMethod, requiredText } from "./common";

/** Staff usernames. Also the Better Auth username validator (server/auth/auth.ts). */
export const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/;
export const PASSWORD_MIN = 8;
/** Better Auth hashes at most 128 characters by default. */
export const PASSWORD_MAX = 128;

const newPassword = z
  .string()
  .min(PASSWORD_MIN, `${PASSWORD_MIN} caractères minimum.`)
  .max(PASSWORD_MAX, `${PASSWORD_MAX} caractères maximum.`);

export const loginSchema = z.object({
  username: requiredText("L'identifiant", 40),
  password: z.string().min(1, "Le mot de passe est requis."),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** Signed-in staff member changing their own password. */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Le mot de passe actuel est requis."),
    newPassword,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Les deux mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    message: "Choisissez un mot de passe différent de l'actuel.",
    path: ["newPassword"],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/** Admin setting a new password for a staff member. */
export const resetPasswordSchema = z.object({ password: newPassword });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/** Admin changing a staff member's role or (de)activating the account. */
export const staffUpdateSchema = z
  .object({
    role: z.enum(["admin", "reception", "technician"]).optional(),
    banned: z.boolean().optional(),
  })
  .refine((v) => v.role !== undefined || v.banned !== undefined, "Rien à modifier.");
export type StaffUpdateInput = z.infer<typeof staffUpdateSchema>;

export const customerSchema = z.object({
  name: requiredText("Le nom", 80),
  phone: maliPhone,
  altPhone: z.string().trim().max(20),
  notes: optionalText(500),
});
export type CustomerInput = z.infer<typeof customerSchema>;

export const lineSchema = z.object({
  kind: z.enum(["service", "product"]),
  refId: z.string().optional(),
  label: requiredText("Le libellé", 120),
  qty: z.number().int().min(1, "Quantité minimale : 1."),
  unitPrice: amountXOF("Le prix"),
  discount: amountXOF("La remise"),
});
export type LineInput = z.infer<typeof lineSchema>;

export const repairIntakeSchema = z
  .object({
    customerId: z.string().optional(),
    customerName: requiredText("Le nom du client", 80),
    customerPhone: maliPhone,
    brand: requiredText("La marque", 40),
    model: requiredText("Le modèle", 60),
    color: optionalText(30),
    imei: optionalText(30),
    fault: requiredText("La panne", 500),
    conditionNotes: optionalText(500),
    accessories: optionalText(200),
    mode: z.enum(["fixed", "quote"]),
    lines: z.array(lineSchema),
    deposit: amountXOF("L'acompte"),
    depositMethod: paymentMethod,
    estimatedReadyAt: z.string().optional(),
  })
  .refine((v) => v.mode === "quote" || v.lines.length > 0, {
    message: "Ajoutez au moins une prestation pour un prix fixe.",
    path: ["lines"],
  });
export type RepairIntakeInput = z.infer<typeof repairIntakeSchema>;

export const paymentSchema = z.object({
  amount: amountXOF().min(1, "Le montant doit être supérieur à 0."),
  method: paymentMethod,
});
export type PaymentInput = z.infer<typeof paymentSchema>;

export const voidSchema = z.object({
  reason: requiredText("Le motif", 300).min(5, "Précisez le motif (5 caractères minimum)."),
});
export type VoidInput = z.infer<typeof voidSchema>;

export const productSchema = z.object({
  sku: requiredText("La référence", 40),
  name: requiredText("Le nom", 120),
  kind: z.enum(["part", "accessory", "phone"]),
  category: requiredText("La catégorie", 60),
  salePrice: amountXOF("Le prix de vente"),
  minQty: z.number().int().min(0, "Minimum : 0."),
  /** Off = retiré de la vente: hidden from the till and new receipts, history kept. */
  active: z.boolean(),
});
export type ProductInput = z.infer<typeof productSchema>;

export const stockReceiptSchema = z.object({
  supplierId: z.string().min(1, "Choisissez un fournisseur."),
  lines: z
    .array(
      z.object({
        productId: z.string().min(1, "Choisissez un produit."),
        qty: z.number().int().min(1, "Quantité minimale : 1."),
        unitCost: amountXOF("Le coût"),
      }),
    )
    .min(1, "Ajoutez au moins une ligne."),
  amountPaid: amountXOF("Le montant payé"),
  note: optionalText(300),
});
export type StockReceiptInput = z.infer<typeof stockReceiptSchema>;

export const stockAdjustmentSchema = z.object({
  productId: z.string().min(1),
  qtyDelta: z.number().int().refine((v) => v !== 0, "La quantité ne peut pas être 0."),
  reason: requiredText("Le motif", 300),
});
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;

export const supplierSchema = z.object({
  name: requiredText("Le nom", 80),
  phone: z.string().trim().max(20),
  contact: optionalText(80),
  notes: optionalText(300),
});
export type SupplierInput = z.infer<typeof supplierSchema>;

export const saleSchema = z.object({
  customerId: z.string().optional(),
  lines: z.array(lineSchema).min(1, "Le panier est vide."),
  payments: z.array(z.object({ amount: amountXOF().min(1), method: paymentMethod })).min(1, "Ajoutez un paiement."),
});
export type SaleInput = z.infer<typeof saleSchema>;

export const expenseSchema = z.object({
  date: z.string().min(1, "La date est requise."),
  categoryId: z.string().min(1, "Choisissez une catégorie."),
  amount: amountXOF().min(1, "Le montant doit être supérieur à 0."),
  method: paymentMethod,
  note: optionalText(300),
});
export type ExpenseInput = z.infer<typeof expenseSchema>;

export const staffUserSchema = z.object({
  name: requiredText("Le nom", 80),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(USERNAME_PATTERN, "3 à 30 caractères : lettres minuscules, chiffres, point, tiret, tiret bas."),
  role: z.enum(["admin", "reception", "technician"]),
  password: newPassword,
});
export type StaffUserInput = z.infer<typeof staffUserSchema>;

export const serviceSchema = z.object({
  name: requiredText("Le nom", 80),
  summary: requiredText("Le résumé", 160),
  description: optionalText(1000),
  priceFrom: amountXOF("Le prix").nullable(),
  durationLabel: optionalText(40),
  isPublic: z.boolean(),
  active: z.boolean(),
  /** Bundled asset path or uploaded image URL; empty keeps the current image. */
  image: z.string().trim().max(500).optional(),
});
export type ServiceInput = z.infer<typeof serviceSchema>;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const PREFIX = /^[A-Z0-9]{1,5}$/;
const optionalHttpsUrl = z.union([z.literal(""), z.url({ protocol: /^https$/, error: "Adresse https:// invalide." })]);

export const settingsSchema = z.object({
  name: requiredText("Le nom", 80),
  address: requiredText("L'adresse", 200),
  city: requiredText("La ville", 60),
  phones: z.array(maliPhone).min(1, "Au moins un numéro."),
  whatsapp: maliPhone,
  email: z.union([z.literal(""), z.email("E-mail invalide.")]),
  terms: optionalText(2000),
  quoteReady: requiredText("Le message", 500),
  repairReady: requiredText("Le message", 500),
  hours: z
    .array(
      z
        .object({
          days: requiredText("Les jours", 40),
          open: z.string().regex(TIME, "Heure invalide."),
          close: z.string().regex(TIME, "Heure invalide."),
        })
        .refine((h) => h.open < h.close, { message: "La fermeture doit suivre l'ouverture.", path: ["close"] }),
    )
    .min(1, "Au moins une plage d'ouverture.")
    .max(7, "7 plages au maximum."),
  mapUrl: optionalHttpsUrl,
  mapEmbedUrl: optionalHttpsUrl,
  taxRate: z.number({ error: "Le taux doit être un nombre." }).int("Nombre entier.").min(0, "Minimum 0 %.").max(100, "Maximum 100 %."),
  salePrefix: z.string().trim().toUpperCase().regex(PREFIX, "1 à 5 lettres ou chiffres."),
  invoicePrefix: z.string().trim().toUpperCase().regex(PREFIX, "1 à 5 lettres ou chiffres."),
});
export type SettingsInput = z.infer<typeof settingsSchema>;
