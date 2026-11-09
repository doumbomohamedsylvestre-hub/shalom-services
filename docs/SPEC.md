# ShalomServices — v1 Spec Summary (output of interview)

## Context
Greenfield repo (empty, no commits). ShalomServices is a single mobile-phone repair shop in Mali. It needs one web app containing:
(a) a French public website (services, shop info, inquiry/quote/contact forms, repair tracking), and
(b) an internal back office for customers, repairs, technicians, inventory, sales, payments, expenses and reports.
Goal of v1: the shop runs a full week with no paper. Quality first, no hard deadline.

**Fixed stack:** Next.js (App Router), Tailwind, shadcn/ui, Zod, TanStack Query (caching + invalidation), TanStack Form, Drizzle ORM, Neon Postgres, Neon object storage, Better Auth (self-hosted library, data in Neon). Hosting on Vercel with the shop's own domain. Exact versions are pinned to latest stable at kickoff and checked against current docs (see Risks).

---

## 1. Product & scope

**Users**
- **Admin** (owner): everything, including finances, expenses, reports, users, settings and voids.
- **Reception / cashier**: customers, repair intake, sales, payments, expenses (entry only), inbox, assigning and reassigning technicians, discounts (unlimited).
- **Technician**: the unclaimed repair queue (claim) plus "my repairs": update status, diagnosis notes and quote lines, record parts used. No finance views.
- **Public visitor / customer**: no account. Views the site, submits forms, tracks a repair with ticket code + phone.

**In scope for v1**
- Public site: home, services (from the database), about, contact (hours, map, WhatsApp), inquiry / quote / contact forms, repair tracking page.
- Repairs: intake, two modes per ticket (**fixed price** or **diagnose → quote → approve/refuse**), status history, technician claiming, deposits, pickup with full payment.
- Inventory: parts, accessories and phones, all tracked by **quantity** (no IMEI units), suppliers, stock receipts, weighted average cost, minimum stock levels, adjustments.
- Counter sales with per-line discounts (who gave each discount is recorded).
- Payments recorded manually (cash / Orange Money / Moov Money / bank), in whole XOF. Partial payment only as a deposit; the balance must be zero at pickup or sale (**no credit**).
- Expenses with admin-managed categories.
- Reports: revenue & profit, repair operations, stock, top sellers (admin only).
- WhatsApp click-to-send messages (pre-filled `wa.me` links) for quote-ready and repair-ready.
- Printing: 80mm thermal (intake ticket, sale receipt) and A4 (quote, invoice) print layouts.
- Audit log, plus void-with-reason for money and stock records.

**Out of scope for v1**
- Online payments
- Automated SMS or email
- Customer accounts
- Multiple branches (the schema is ready for them)
- Warranty tracking
- Per-unit IMEI inventory
- Repair photos
- Offline mode
- Purchase orders and supplier debt
- Customer credit
- Cash reconciliation and closing
- Recurring expenses
- Technician commissions
- TVA (the setting exists, defaulting to 0)
- Other languages (French is hardcoded)
- Data import
- Turnstile
- Sentry

---

## 2. Core flows

1. **Intake (reception).**
   - Find or create the customer by phone number.
   - Enter the device: brand, model, colour, optional IMEI/serial as free text, reported fault, condition notes, accessories left.
   - Choose the mode:
     - *Fixed*: enter the service lines and price.
     - *Quote*: the ticket goes to diagnosis.
   - Optional deposit.
   - Print the 80mm ticket showing the code, the tracking URL and the shop's terms.
   - The ticket appears in the technician queue.
2. **Technician.** Claim a ticket from the queue. In quote mode: diagnose and add quote lines (services + parts) → status *Quote sent*. Reception sends the WhatsApp message and records approval or refusal. Then *In repair* / *Waiting for parts* → *Ready*. Parts used create stock movements, and their cost is frozen onto the line.
3. **Pickup (reception).** Take the remaining payment (the balance must reach 0) → *Picked up*. Print the invoice (A4) or receipt (80mm).
4. **Repair statuses.** Received → Diagnosing → Quote sent → Approved / Refused → In repair ⇄ Waiting for parts → Ready → Picked up. Side exits: Unrepairable, Returned unrepaired, Cancelled. Fixed-price tickets skip the diagnosis and quote steps. Transitions are enforced in a single state-machine module.
5. **Counter sale.** Add products → per-line discounts → payment(s) totalling the amount due → stock goes down → print the receipt.
6. **Stock receipt.** Choose a supplier → enter lines (product, quantity, unit cost) → stock goes up and the weighted average cost is recalculated.
7. **Public request.** A visitor submits a form → it lands in the inbox (New / Contacted / Converted / Closed) → reception can convert it into a customer + repair ticket in one click.
8. **Public tracking.** Enter code + phone → see a status timeline only (no prices, no personal data beyond a masked name).
9. **Expense.** Admin or reception records date, category, amount, method and note.

---

## 3. Data model (Postgres via Drizzle)

All money is stored as `integer` XOF. Every table has `created_at` and `created_by`. Location-bound tables carry `branch_id`.

| Entity | Key fields / rules |
|---|---|
| `branches` | One seeded row |
| Better Auth tables (`user`, `session`, `account`, `verification`) | Plus `username` (unique), `role` (admin / reception / technician), `active` |
| `customers` | name, phone (normalized to +223, **unique**), optional alt phone and notes |
| `services` | name, description, `price_from`, image key, `is_public`, `active`, `sort` |
| `product_categories`, `products` | sku (unique), name, kind (part / accessory / phone), sale_price, avg_cost, qty_on_hand, min_qty, active |
| `suppliers` | |
| `stock_receipts`, `stock_receipt_lines` | Each receipt raises stock and updates the average cost |
| `stock_movements` | Ledger: type (receipt / sale / repair_use / adjustment / void), qty_delta, unit_cost, ref. `qty_on_hand` is updated in the same transaction. |
| `repairs` | public `code` (unique, non-sequential, e.g. `SS-7K3M9Q`), customer, device fields, mode, status, technician_id (nullable = in the queue), estimated_ready_at, totals |
| `repair_lines` | service or product, qty, unit_price, unit_cost snapshot, discount, discount_by |
| `repair_status_events` | from, to, by, at, note |
| `sales`, `sale_lines` | Same line shape as `repair_lines`. Sequential document number. |
| `payments` | repair_id or sale_id, amount, method, kind (deposit / payment), received_by, voided_at / by / reason |
| `expense_categories`, `expenses` | void fields as above |
| `inquiries` | type (repair / quote / contact), name, phone, device, message, status, converted_repair_id |
| `shop_settings` | Single row: name, address, hours, phones, WhatsApp, map, terms text, tax_rate = 0, document prefixes |
| `audit_log` | actor, action, entity, entity_id, before/after JSON, at |

**Invariants**
- `qty_on_hand` never goes below 0 (checked in the transaction).
- A repair can't reach *Picked up* with a balance due.
- Voids create reversing movements; nothing is hard-deleted.

---

## 4. Architecture

**Layout**
- `app/(public)` holds the server-rendered public site. Pages are cached and refreshed with `revalidateTag` when services or settings change.
- `app/(dashboard)` holds the client-heavy back office, using TanStack Query + TanStack Form + shadcn.
- `lib/server/*` is the service layer and the **single home for business logic and authorization**. It covers status machine, stock and average cost, totals and permission checks. Each function receives the session, checks the role, and runs inside a Drizzle transaction.

**Transport**
- Route Handlers under `/api/...` (JSON) serve TanStack Query.
- Zod schemas are shared between forms, handlers and the service layer.
- Query keys are organized by entity, so a mutation invalidates the related lists (for example, a payment invalidates the repair, sales and reports).

**Database driver**
- Use a Neon driver that supports **interactive transactions**: the WebSocket `Pool` / `drizzle-orm/neon-serverless`. The `neon-http` driver can't run interactive transactions, and stock and money depend on them.

**Auth**
- Better Auth with the Drizzle adapter, the `username` plugin and role-based access (a role field, or the admin plugin).
- Public sign-up is disabled. The first admin comes from a seed script. The admin resets passwords and deactivates staff, which revokes their sessions.
- Middleware guards `/dashboard`. Every API handler checks the role again.

**Other pieces**
- **Storage:** Neon object storage (S3-compatible), used only for service and site images, through presigned upload. Images are compressed on the client.
- **Printing:** print-optimized HTML routes with `@page` CSS (80mm and A4). The browser print dialog prints or saves to PDF.
- **Anti-abuse:** a honeypot field plus a simple per-IP rate limit (a database table) on public forms and tracking lookups.

---

## 5. Non-functional
- French only, XOF formatting with `fr-ML` conventions (spaces between thousands), time zone Africa/Bamako (UTC+0).
- Responsive (reception on desktop, technicians on phones) and light on slow 3G/4G. Online-only, with a clear offline banner.
- Personal data is limited to customer name and phone. The tracking page shows minimal data.
- Accessibility: keyboard and labels, using shadcn defaults.

## 6. Delivery & quality
- **Environments:** local, Vercel preview and production, each with its own Neon branch.
- **CI:** GitHub Actions runs lint, typecheck, Vitest, Playwright and a Drizzle migration check.
- **Migrations:** applied on deploy.
- **Observability:** Vercel logs only (no Sentry), plus the audit log.
- **Tests:**
  - Vitest on the service layer: weighted average cost, stock invariants, totals and discounts, status machine, permissions.
  - Playwright: intake → repair → pickup and payment, counter sale, inquiry → convert, public tracking.
- **Staged build order:**
  1. Foundation (auth, roles, settings, layout)
  2. Customers + repairs
  3. Inventory + suppliers + sales
  4. Payments, expenses, voids, audit
  5. Reports
  6. Public site + inbox + tracking
  7. Hardening

---

## ASSUMPTIONS (not firmly decided by you)
1. An optional free-text IMEI/serial field on repair intake, for identification only.
2. A deposit is allowed at intake. "No credit" means the balance must be zero at pickup or sale.
3. Every discount records who gave it and how much, for audit.
4. Honeypot + rate limit on public forms and tracking, despite "no spam protection in v1".
5. Technicians see the unclaimed queue plus their own tickets. Admin and reception can reassign.
6. The expense "receipt photo" is **dropped**, because storage is limited to site images.
7. Quotes and invoices are browser-printed HTML (print or save as PDF), not server-generated PDF files.
8. Phone numbers are normalized to Mali `+223` format, and one customer per phone number.
9. TVA rate setting = 0%, to be confirmed with the accountant.
10. The device passcode is **not** stored (security). Staff ask for it in person.
11. The public tracking code is random (not sequential). Sales and invoice numbers are sequential.
12. Only the admin can void. Reception can enter expenses but can't see expense reports.

## OPEN RISKS / unknowns
- **Library versions** (Next.js, better-auth, drizzle-orm / drizzle-kit, zod, TanStack Query/Form, Tailwind, shadcn CLI) must be checked against current docs at kickoff. Most important: Better Auth's username plugin and role setup, and Zod-version compatibility with TanStack Form.
- **Neon object storage** is newer than core Neon. Confirm availability, pricing and the presigned-upload API. Fallback: Vercel Blob or Cloudflare R2.
- **Vercel Hobby forbids commercial use**, so the shop needs Pro (about $20/month), plus Neon's paid plan once the free tier is outgrown.
- **No cash reconciliation, unlimited discounts and no credit control:** fraud and leakage depend on the audit log and the owner reviewing reports.
- **French hardcoded:** adding a language later means reworking every screen.
- **No email or Sentry:** errors and new inquiries are only noticed by checking the dashboard and logs.
- **No warranty tracking** may cause counter disputes on returned repairs.
- **Browser thermal printing** depends on the printer driver and browser margins. Test early on the shop's actual printer.
- **Weighted average cost and voids:** reversing a stock receipt after sales have already happened needs a clear rule. Proposed: void it as a reversing movement at the current average cost, without recalculating history.


# ShalomServices — Implementation Plan (v1)

Source of truth for scope: [SPEC.md](SPEC.md). This plan only orders the work. Each phase ends in something deployable that the shop can use or review.

## 0. Pinned versions (checked on npm, 2026-11-09)

| Package | Version | Notes |
|---|---|---|
| next | 16.4.5 | App Router, Turbopack |
| react / react-dom | 19.3.1 | |
| tailwindcss | 4.3.5 | CSS-first config (`@theme`), no `tailwind.config.js` |
| shadcn (CLI) | 4.23.0 | `npx shadcn@4.23.0 init` |
| zod | 4.6.7 | TanStack Form takes Zod 4 directly (Standard Schema) |
| @tanstack/react-query | 5.107.1 | + devtools |
| @tanstack/react-form | 1.33.5 | |
| drizzle-orm / drizzle-kit | 0.45.4 / 0.31.11 | |
| @neondatabase/serverless | 1.2.0 | WebSocket `Pool` → `drizzle-orm/neon-serverless`, needed for transactions |
| better-auth | 1.7.18 | Plugins: `better-auth/plugins/username`, `.../admin`, `.../access` |
| vitest | 5.1.0 | |
| @playwright/test | 1.65.0 | |
| Node | 26.x locally; set Vercel to its latest supported LTS | |

Versions are pinned exactly in `package.json` (no `^`). Upgrades are a deliberate PR.

## 1. Project structure

```
src/
  app/
    (public)/               # French marketing site, SSR + cache tags
      page.tsx, services/, a-propos/, contact/, devis/, suivi/
    (dashboard)/tableau-de-bord/
      reparations/, clients/, stock/, fournisseurs/, ventes/,
      depenses/, rapports/, demandes/, utilisateurs/, parametres/
    print/                  # print-only layouts: ticket-80mm, recu-80mm, devis-a4, facture-a4
    api/
      auth/[...all]/route.ts   # Better Auth handler
      <entity>/route.ts        # JSON handlers for TanStack Query
  server/
    db/ (client.ts, schema/*.ts, seed.ts)
    auth/ (auth.ts, permissions.ts, session.ts)
    services/               # business logic + authorization, one file per domain
      repairs.ts, repair-status.ts (state machine), stock.ts (WAC, movements),
      sales.ts, payments.ts, expenses.ts, inquiries.ts, reports.ts, audit.ts, rate-limit.ts
    storage/ (s3.ts)        # Neon object storage, presigned uploads
  shared/
    schemas/                # Zod, used by forms, handlers and services
    money.ts, phone.ts, dates.ts, labels.ts (French status labels)
  client/
    query-keys.ts, api.ts (fetch wrapper), hooks/use-<entity>.ts
  components/ (ui/ = shadcn, plus domain components)
tests/ (unit/, e2e/)
drizzle/ (generated migrations)
```

**Rules**
- Pages and route handlers never touch `db` directly. They call `server/services/*`, passing `session`.
- Every service function:
  1. calls `assertCan(session, permission)`
  2. validates input with the shared Zod schema
  3. runs in `db.transaction`
  4. writes `audit_log` when it changes money or stock
- Errors are a typed `AppError(code, messageFr)`. Handlers map them to HTTP status and a French message. The client shows it in a toast or the form.
- Money: `integer` XOF everywhere, formatted only in the UI (`Intl.NumberFormat('fr-ML')`).
