// Idempotent seed: the shop's branch row and the first admin account.
// Usage: npm run db:seed   (reads .env.local; safe to run repeatedly)
//
// Required env: SEED_ADMIN_USERNAME, SEED_ADMIN_PASSWORD. Optional: SEED_ADMIN_NAME.
// The admin should change the password after first login.
//
// Always (idempotent, never overwrites edits): shop settings row, the service
// catalogue, product and expense categories (scripts/seed-data.ts).
//
// Optional, local/preview only: SEED_STAFF_PASSWORD also creates the sample
// reception and technician accounts below (same names as the demo data), all
// with that password. SEED_SAMPLE_CATALOG=1 adds the demo suppliers and
// products with an opening stock. Never set either for production.
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

/** Sample staff for local and preview databases, one per non-admin role. */
const SAMPLE_STAFF = [
  { username: "aissata", name: "Aïssata Coulibaly", role: "reception" },
  { username: "ibrahim", name: "Ibrahim Diarra", role: "technician" },
  { username: "seydou", name: "Seydou Keïta", role: "technician" },
] as const;

async function main() {
  // Imported after env is loaded: the db client reads DATABASE_URL at import time.
  const { eq } = await import("drizzle-orm");
  const { db } = await import("../server/db/client");
  const { branches, user } = await import("../server/db/schema");
  const { auth } = await import("../server/auth/auth");

  const [existingBranch] = await db.select({ id: branches.id }).from(branches).limit(1);
  if (existingBranch) {
    console.log("[seed] branch already exists");
  } else {
    await db.insert(branches).values({ name: "Boutique principale" });
    console.log("[seed] created branch 'Boutique principale'");
  }

  const username = process.env.SEED_ADMIN_USERNAME?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!username || !password) {
    throw new Error("SEED_ADMIN_USERNAME and SEED_ADMIN_PASSWORD must be set");
  }

  const [existingAdmin] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.username, username))
    .limit(1);
  if (existingAdmin) {
    console.log(`[seed] user '${username}' already exists, left unchanged`);
  } else {
    // Server-side admin API: works with public sign-up disabled.
    await auth.api.createUser({
      body: {
        email: `${username}@staff.invalid`,
        password,
        name: process.env.SEED_ADMIN_NAME ?? "Administrateur",
        role: "admin",
        data: { username, displayUsername: username },
      },
    });
    console.log(`[seed] created admin '${username}'`);
  }

  const staffPassword = process.env.SEED_STAFF_PASSWORD;
  if (staffPassword) {
    if (process.env.VERCEL_ENV === "production") {
      throw new Error("SEED_STAFF_PASSWORD must not be set in production");
    }
    for (const s of SAMPLE_STAFF) {
      const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.username, s.username)).limit(1);
      if (existing) {
        console.log(`[seed] user '${s.username}' already exists, left unchanged`);
        continue;
      }
      await auth.api.createUser({
        body: {
          email: `${s.username}@staff.invalid`,
          password: staffPassword,
          name: s.name,
          role: s.role,
          data: { username: s.username, displayUsername: s.username },
        },
      });
      console.log(`[seed] created ${s.role} '${s.username}'`);
    }
  } else {
    console.log("[seed] SEED_STAFF_PASSWORD not set: sample staff skipped");
  }

  await seedReferenceData(db);
  if (process.env.SEED_SAMPLE_CATALOG === "1") {
    if (process.env.VERCEL_ENV === "production") throw new Error("SEED_SAMPLE_CATALOG must not be set in production");
    await seedSampleCatalog(db);
  } else {
    console.log("[seed] SEED_SAMPLE_CATALOG not set: sample products and suppliers skipped");
  }

  await db.$client.end();
}

type Db = typeof import("../server/db/client").db;

/** Settings, services and categories. Inserts only what is missing. */
async function seedReferenceData(db: Db) {
  const schema = await import("../server/db/schema");
  const { DEFAULT_SETTINGS } = await import("../server/services/settings");
  const data = await import("./seed-data");

  const settings = await db
    .insert(schema.shopSettings)
    .values({
      id: 1,
      name: DEFAULT_SETTINGS.name,
      address: DEFAULT_SETTINGS.address,
      city: DEFAULT_SETTINGS.city,
      phones: DEFAULT_SETTINGS.phones,
      whatsapp: DEFAULT_SETTINGS.whatsapp,
      email: DEFAULT_SETTINGS.email ?? null,
      mapUrl: DEFAULT_SETTINGS.mapUrl ?? null,
      mapEmbedUrl: DEFAULT_SETTINGS.mapEmbedUrl ?? null,
      hours: DEFAULT_SETTINGS.hours,
      terms: DEFAULT_SETTINGS.terms,
      taxRate: DEFAULT_SETTINGS.taxRate,
      salePrefix: DEFAULT_SETTINGS.prefixes.sale,
      invoicePrefix: DEFAULT_SETTINGS.prefixes.invoice,
      waQuoteReady: DEFAULT_SETTINGS.whatsappTemplates.quoteReady,
      waRepairReady: DEFAULT_SETTINGS.whatsappTemplates.repairReady,
    })
    .onConflictDoNothing()
    .returning({ id: schema.shopSettings.id });
  console.log(settings.length ? "[seed] created shop settings (placeholder phones: edit them in Paramètres)" : "[seed] shop settings already exist");

  const services = await db
    .insert(schema.services)
    .values(data.SERVICES.map((s) => ({ ...s })))
    .onConflictDoNothing({ target: schema.services.slug })
    .returning({ id: schema.services.id });
  console.log(`[seed] services: ${services.length} created`);

  const pc = await db
    .insert(schema.productCategories)
    .values(data.PRODUCT_CATEGORIES.map((name) => ({ name })))
    .onConflictDoNothing({ target: schema.productCategories.name })
    .returning({ id: schema.productCategories.id });
  const ec = await db
    .insert(schema.expenseCategories)
    .values(data.EXPENSE_CATEGORIES.map((name) => ({ name })))
    .onConflictDoNothing({ target: schema.expenseCategories.name })
    .returning({ id: schema.expenseCategories.id });
  console.log(`[seed] categories: ${pc.length} product, ${ec.length} expense created`);
}

/** Dev/preview: demo suppliers and products, opening stock recorded as an adjustment. */
async function seedSampleCatalog(db: Db) {
  const schema = await import("../server/db/schema");
  const data = await import("./seed-data");

  const [anyProduct] = await db.select({ id: schema.products.id }).from(schema.products).limit(1);
  if (anyProduct) {
    console.log("[seed] products already exist: sample catalogue skipped");
    return;
  }
  const [branch] = await db.select({ id: schema.branches.id }).from(schema.branches).limit(1);
  const categories = new Map(
    (await db.select({ id: schema.productCategories.id, name: schema.productCategories.name }).from(schema.productCategories)).map((c) => [c.name, c.id]),
  );
  await db.transaction(async (tx) => {
    await tx.insert(schema.suppliers).values(data.SAMPLE_SUPPLIERS);
    for (const [sku, name, kind, category, salePrice, avgCost, qty, minQty] of data.SAMPLE_PRODUCTS) {
      const [p] = await tx
        .insert(schema.products)
        .values({ branchId: branch!.id, sku, name, kind, categoryId: categories.get(category)!, salePrice, avgCost, qtyOnHand: qty, minQty })
        .returning({ id: schema.products.id });
      if (qty > 0) {
        await tx.insert(schema.stockMovements).values({
          branchId: branch!.id,
          productId: p!.id,
          type: "adjustment",
          qtyDelta: qty,
          unitCost: avgCost,
          reason: "Stock initial (données de démonstration)",
        });
      }
    }
  });
  console.log(`[seed] sample catalogue: ${data.SAMPLE_SUPPLIERS.length} suppliers, ${data.SAMPLE_PRODUCTS.length} products`);
}

main().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
