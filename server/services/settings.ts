/**
 * Shop settings and the service catalogue (Paramètres). Public reads have no
 * session (public site); writes are admin only and refresh the public pages.
 */
import { asc, eq, like } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { db } from "@/server/db/client";
import { services as servicesTable, shopSettings } from "@/server/db/schema";
import { AppError, notFound } from "@/server/errors";
import { isAllowedImageUrl, presignServiceImageUpload } from "@/server/storage";
import { assertCan, type StaffSession } from "@/server/auth/session";
import type { Service, ShopSettings } from "@/shared/domain/types";
import { normalizeMaliPhone } from "@/shared/phone";
import { serviceSchema, settingsSchema, type ServiceInput, type SettingsInput } from "@/shared/schemas/staff";
import { z } from "zod";
import { audit, orUndef } from "./_shared";

/** Used until the owner saves Paramètres once (or `npm run db:seed` runs). */
export const DEFAULT_SETTINGS: ShopSettings = {
  name: "Shalom Service",
  address: "Sénou, près du marché",
  city: "Bamako, Mali",
  // Placeholders until the owner enters the real numbers in Paramètres
  // (the public layout always needs at least one phone).
  phones: ["+22370000000"],
  whatsapp: "+22370000000",
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
    quoteReady: "Bonjour {client}, le devis pour votre {appareil} est prêt : {montant}. Répondez OUI pour lancer la réparation. Shalom Service",
    repairReady: "Bonjour {client}, votre {appareil} est prêt ! Vous pouvez passer le récupérer. Ticket {code}. Shalom Service",
  },
};

export const DEFAULT_SERVICE_IMAGE = "/assets/services/service-precision-repair.webp";

type SettingsRow = typeof shopSettings.$inferSelect;
type ServiceRow = typeof servicesTable.$inferSelect;

function toSettings(row: SettingsRow): ShopSettings {
  return {
    name: row.name,
    address: row.address,
    city: row.city,
    phones: row.phones,
    whatsapp: row.whatsapp,
    email: orUndef(row.email),
    mapUrl: orUndef(row.mapUrl),
    mapEmbedUrl: orUndef(row.mapEmbedUrl),
    hours: row.hours,
    terms: row.terms,
    taxRate: row.taxRate,
    prefixes: { sale: row.salePrefix, invoice: row.invoicePrefix },
    whatsappTemplates: { quoteReady: row.waQuoteReady, repairReady: row.waRepairReady },
  };
}

function toService(row: ServiceRow): Service {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    summary: row.summary,
    description: row.description,
    priceFrom: row.priceFrom,
    durationLabel: row.durationLabel,
    image: row.image,
    isPublic: row.isPublic,
    active: row.active,
    sort: row.sort,
  };
}

/** Shop details. Public: shown on the site, tickets and invoices. */
export async function readSettings(): Promise<ShopSettings> {
  const [row] = await db.select().from(shopSettings).where(eq(shopSettings.id, 1)).limit(1);
  return row ? toSettings(row) : DEFAULT_SETTINGS;
}

/** Signed-in staff (any role): print layouts and WhatsApp messages need it. */
export async function getSettings(session: StaffSession): Promise<ShopSettings> {
  void session;
  return readSettings();
}

export async function saveSettings(session: StaffSession, input: SettingsInput): Promise<ShopSettings> {
  assertCan(session, { settings: ["update"] });
  const v = settingsSchema.parse(input);
  const current = await readSettings();
  const values = {
    name: v.name,
    address: v.address,
    city: v.city,
    phones: v.phones.map((p) => normalizeMaliPhone(p)!),
    whatsapp: normalizeMaliPhone(v.whatsapp)!,
    email: v.email || null,
    terms: v.terms,
    waQuoteReady: v.quoteReady,
    waRepairReady: v.repairReady,
    hours: v.hours,
    mapUrl: v.mapUrl || null,
    mapEmbedUrl: v.mapEmbedUrl || null,
    taxRate: v.taxRate,
    salePrefix: v.salePrefix,
    invoicePrefix: v.invoicePrefix,
    updatedBy: session.user.id,
  };
  const saved = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(shopSettings)
      .values({ id: 1, ...values })
      .onConflictDoUpdate({ target: shopSettings.id, set: values })
      .returning();
    await audit(tx, session, { action: "update", entity: "Paramètres", entityRef: v.name, summary: "Informations de la boutique modifiées.", before: current, after: values });
    return row!;
  });
  revalidateTag("settings", { expire: 0 });
  return toSettings(saved);
}

/** Public site: visible and active services only. */
export async function readPublicServices(): Promise<Service[]> {
  const rows = await db.select().from(servicesTable).orderBy(asc(servicesTable.sort), asc(servicesTable.name));
  return rows.filter((s) => s.isPublic && s.active).map(toService);
}

/** Back office: every service (quote lines, Paramètres). Any signed-in staff. */
export async function listServices(session: StaffSession, opts: { publicOnly?: boolean } = {}): Promise<Service[]> {
  void session;
  const rows = await db.select().from(servicesTable).orderBy(asc(servicesTable.sort), asc(servicesTable.name));
  return rows.filter((s) => (opts.publicOnly ? s.isPublic && s.active : true)).map(toService);
}

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "prestation"
  );
}

export async function saveService(session: StaffSession, input: ServiceInput, id?: string): Promise<Service> {
  assertCan(session, { settings: ["update"] });
  const v = serviceSchema.parse(input);
  const fields = {
    name: v.name,
    summary: v.summary,
    description: v.description,
    priceFrom: v.priceFrom,
    durationLabel: v.durationLabel,
    isPublic: v.isPublic,
    active: v.active,
    ...(v.image && { image: v.image }),
  };
  if (v.image && !isAllowedImageUrl(v.image)) throw new AppError("INVALID_IMAGE", "Image non reconnue : envoyez-la depuis ce formulaire.", 422);
  const saved = await db.transaction(async (tx) => {
    if (id) {
      const [before] = await tx.select().from(servicesTable).where(eq(servicesTable.id, id)).limit(1);
      if (!before) throw notFound("Prestation");
      const [row] = await tx.update(servicesTable).set(fields).where(eq(servicesTable.id, id)).returning();
      await audit(tx, session, { action: "update", entity: "Prestation", entityId: id, entityRef: v.name, summary: "Prestation modifiée.", before: toService(before), after: fields });
      return row!;
    }
    // Unique slug: "ecran", "ecran-2", …
    const base = slugify(v.name);
    const taken = new Set((await tx.select({ slug: servicesTable.slug }).from(servicesTable).where(like(servicesTable.slug, `${base}%`))).map((r) => r.slug));
    let slug = base;
    for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
    const all = await tx.select({ sort: servicesTable.sort }).from(servicesTable);
    const sort = all.reduce((m, r) => Math.max(m, r.sort), 0) + 1;
    const [row] = await tx
      .insert(servicesTable)
      .values({ ...fields, slug, sort, image: fields.image ?? DEFAULT_SERVICE_IMAGE, createdBy: session.user.id })
      .returning();
    await audit(tx, session, { action: "create", entity: "Prestation", entityId: row!.id, entityRef: v.name, summary: "Prestation ajoutée." });
    return row!;
  });
  revalidateTag("services", { expire: 0 });
  return toService(saved);
}


const uploadSchema = z.object({ contentType: z.string(), size: z.number() });

/** Presigned upload URL for a new service image (admin). */
export async function requestServiceImageUpload(session: StaffSession, input: { contentType: string; size: number }) {
  assertCan(session, { settings: ["update"] });
  const v = uploadSchema.parse(input);
  return presignServiceImageUpload(v.contentType, v.size);
}
