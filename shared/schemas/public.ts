import { z } from "zod";
import { maliPhone, optionalText, requiredText } from "./common";

/**
 * Hidden honeypot field (SPEC assumption 4). Accepted by validation on
 * purpose: the server answers a filled one with a fake success and stores
 * nothing, so bots get no signal.
 */
const honeypot = z.string().max(500).optional();

export const inquirySchema = z.object({
  type: z.enum(["repair", "quote", "contact"]),
  name: requiredText("Le nom", 80),
  phone: maliPhone,
  device: optionalText(120),
  message: requiredText("Le message", 1000),
  website: honeypot,
});
export type InquiryInput = z.infer<typeof inquirySchema>;

export const trackingSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^SS-[A-Z0-9]{6}$/, "Code invalide (ex. SS-7K3M9Q)."),
  phone: maliPhone,
});
export type TrackingInput = z.infer<typeof trackingSchema>;
