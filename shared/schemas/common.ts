import { z } from "zod";
import { normalizeMaliPhone } from "@/shared/phone";

export const requiredText = (label: string, max = 200) =>
  z.string().trim().min(1, `${label} est requis.`).max(max, `${label} est trop long.`);

export const optionalText = (max = 500) => z.string().trim().max(max, "Texte trop long.");

/** Accepts "70 12 34 56", "+223 70123456"…; validation only (normalize server-side). */
export const maliPhone = z
  .string()
  .trim()
  .min(1, "Le numéro de téléphone est requis.")
  .refine((v) => v === "" || normalizeMaliPhone(v) !== null, "Numéro invalide (8 chiffres, ex. 70 12 34 56).");

export const amountXOF = (label = "Le montant") =>
  z.number({ error: `${label} doit être un nombre.` }).int(`${label} doit être un entier.`).min(0, `${label} ne peut pas être négatif.`);

export const paymentMethod = z.enum(["cash", "orange_money", "moov_money", "bank"]);
