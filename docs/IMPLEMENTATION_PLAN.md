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

## 2. Phases

### Phase 1 — Foundation
- Scaffold Next 16 + TS strict + Tailwind 4 + shadcn. Add ESLint, Prettier, path aliases.
- Neon project:
  - branches `main` (prod), `dev`, plus preview branches through the Neon ↔ Vercel integration
  - set up `drizzle.config.ts` and migration scripts
- Schema:
  - `branches`, Better Auth tables (generated with `@better-auth/cli generate` for Drizzle)
  - additional user fields: `role`, `active`, `branchId`
  - `shop_settings`, `audit_log`, `rate_limits`
- Better Auth:
  - plugins: username + admin, with access control roles `admin`, `reception`, `technician`
  - `emailAndPassword.disableSignUp: true`
  - a hidden placeholder email per user, since username is the login
- `permissions.ts`: a role → permission matrix, the single map used by both the server and UI gating.
- `seed.ts`: the branch, the first admin (credentials read from env), default settings, expense categories.
- Dashboard layout:
  - responsive sidebar, role-filtered navigation
  - offline banner (`navigator.onLine` + query error state)
  - `QueryClientProvider` with defaults: `staleTime` 30s, retry 1, no refetch on window focus for heavy lists
- Users screen (admin): create, set role, reset password, deactivate (revokes sessions).
- Settings screen: shop info, terms, document prefixes, tax rate (0).
- CI (GitHub Actions): install → lint → typecheck → vitest → drizzle-kit check.

**Done when** the admin logs in on a preview deploy, creates a technician, and the technician sees a restricted navigation.

### Phase 2 — Customers + Repairs (first usable stage)
- `customers`, `services`, `repairs`, `repair_lines`, `repair_status_events`.
- `phone.ts`: Mali normalisation to `+223XXXXXXXX`, 8 digits, with validation.
- Repair code generator: 6-character Crockford base32 with an `SS-` prefix; retry on unique collision.
- `repair-status.ts`: the transition table for each mode (fixed / quote) with allowed roles.
  - Pure functions, 100% unit-tested.
- Screens:
  - Intake wizard: customer lookup/create → device → mode → lines → deposit.
  - Repairs list: filters by status/technician, search by code, phone or name.
  - Technician queue + "Mes réparations" (mobile-first cards).
  - Repair detail: timeline, lines, claim/assign, status actions, quote approve/refuse.
  - WhatsApp button: `wa.me/<phone>?text=` with French templates from settings.
- Print: `ticket-80mm` (intake) and `devis-a4`.
- Deposits are recorded through a temporary minimal `payments` table, completed in Phase 4.

**Done when** a real repair goes through intake → claim → quote → approval → ready, printed on the shop's thermal printer. **Test the printer here (risk).**

### Phase 3 — Inventory, suppliers, sales
- `product_categories`, `products`, `suppliers`, `stock_receipts(+lines)`, `stock_movements`, `sales(+lines)`.
- `stock.ts`:
  - `applyMovement`: locks the product row (`SELECT … FOR UPDATE`), checks that quantity stays ≥ 0, updates `qty_on_hand`
  - weighted average cost on receipt: `newAvg = round((qty*avg + inQty*inCost) / (qty+inQty))`
  - outgoing lines snapshot `unit_cost = avg_cost`
- Parts on repair lines create `repair_use` movements when the line is confirmed. Removing a line reverses its movement.
- Sale screen (counter, POS-style):
  - product search, quantity, per-line discount (recording `discount_by`)
  - payments must add up to the total before confirming
  - sequential number per prefix, from a database sequence
- Print `recu-80mm`. Stock adjustments require a reason. Low-stock badge.

**Done when** receiving 10 screens at 2 prices produces the correct average, and selling or using them produces correct stock and frozen cost.

### Phase 4 — Payments, pickup, expenses, voids, audit
- Finish `payments`: methods cash / orange_money / moov_money / bank, and kinds deposit / payment.
- Pickup: the balance must be 0 (enforced in the service, not just the UI) → *Picked up* → `facture-a4` / `recu-80mm`.
- Expenses + categories (admin manages categories; reception creates expenses).
- Voids (admin only, reason required):
  - payment, sale (reverses stock), stock receipt (reversal at the current average cost, no history recalculation), expense
  - voided rows stay visible, struck through
- Audit log viewer (admin), filtered by entity or user.

**Done when** every money or stock record can be voided with a reason, totals and stock reconcile afterwards, and the audit log shows who did it.

### Phase 5 — Reports (admin)
- One SQL query per report in `reports.ts` over a date range (Africa/Bamako, effectively UTC):
  - Revenue & profit: repair vs sales revenue, cost of goods (frozen costs), expenses by category, net
  - Repairs: open by status, overdue (past `estimated_ready_at`), average turnaround, per-technician count, quote acceptance rate
  - Stock: low stock, stock value at average cost, movement history
  - Top products / services
- Simple shadcn charts (Recharts) plus tables. Dashboard home shows today's key numbers, filtered by role.

### Phase 6 — Public site, inbox, tracking
- Pages (French): Accueil, Services (from the DB, `is_public`), À propos, Contact (map embed, WhatsApp, hours), Demande de devis / réparation, Suivi.
- Data fetched with `"use cache"` / `cacheTag('services' | 'settings')`. Admin edits call `revalidateTag`.
- Service images: Neon object storage through presigned PUT, client-side compression (`browser-image-compression`), WebP. **Confirm the Neon storage API at the start of this phase; fallback is Vercel Blob.**
- Forms submit to `inquiries` with a honeypot field and a per-IP rate limit (DB table, e.g. 5 per 10 minutes).
- Inbox: statuses New / Contacted / Converted / Closed. "Convert" creates the customer (if needed) and a repair, pre-filled.
- Tracking: code + phone (both must match), rate-limited. Shows the status timeline and a masked first name only.
- SEO basics: metadata, OpenGraph, `sitemap.ts`, LocalBusiness JSON-LD.

### Phase 7 — Hardening & launch
- Playwright end-to-end tests for the four core flows, run in CI against a Neon branch.
- Performance on throttled 3G: dashboard JS budget, paginated lists (server-side, 25 per page), `loading.tsx` skeletons.
- Accessibility pass (labels, focus, contrast). Empty and error states on every list.
- Security: role checks on every handler (test matrix), security headers, auth rate limits (Better Auth built-in).
- Production: custom domain, Vercel Pro, Neon prod branch with point-in-time restore confirmed, admin seeded.
- Pilot week in the shop → fix list → v1 done.

## 3. Testing map

| Layer | What |
|---|---|
| Vitest (pure) | status machine, average cost math, totals/discounts, phone normalisation, code generator, permission matrix |
| Vitest (DB, Neon test branch) | stock movements and the quantity ≥ 0 guard under concurrency, pickup requires zero balance, void reversals |
| Playwright | intake → repair → pickup; counter sale; inquiry → convert; public tracking |

## 4. Decisions to confirm before or during Phase 1
- The domain name and the shop's real data: address, hours, phone numbers, WhatsApp number, logo/colours.
- Thermal printer model, to buy or confirm before Phase 2.
- Default French WhatsApp message templates and printed terms (for example the abandoned-device policy).
