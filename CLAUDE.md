# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

ShalomServices: one Next.js app for a single phone-repair shop in Mali. It has two halves:
- a French public website: services, inquiry/quote/contact forms, repair tracking by code + phone
- a staff back office: repairs, customers, stock, sales, payments, expenses, reports

[docs/SPEC.md](docs/SPEC.md) is the agreed v1 scope, data model, and list of ASSUMPTIONS / out-of-scope items. [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) is the phased build order. [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) covers Vercel + Neon. Read the spec before adding features. Many "obvious" features were deliberately excluded: no warranty, IMEI inventory, customer credit, cash reconciliation, email/SMS, or i18n. Flag conflicts instead of reintroducing them.

## Commands

```bash
npm run dev            # Next dev server (Turbopack), http://localhost:3000
npm run build          # migrate-on-deploy (no-op off Vercel) + next build
npm run lint           # eslint
npx tsc --noEmit -p .  # typecheck (no script for it)

npm run db:generate    # drizzle-kit generate -> drizzle/<UTC timestamp>_<name>/migration.sql
npm run db:migrate     # apply migrations to DATABASE_URL_UNPOOLED from .env.local
npm run db:seed        # idempotent: branch row + first admin (SEED_ADMIN_* env)
npm run db:studio
```

There are no tests yet. The plan specifies Vitest for service-layer rules and Playwright for core flows.

For agent-driven migrations, prefer `npx drizzle-kit generate --name <name> --output json`, with `--explain` for a dry run. Note that `migrate` does not accept `--output`.

## Pinned, non-default versions (check APIs against installed code, not memory)

- **Next.js 16.4.5:** has breaking changes from older versions (see AGENTS.md; docs are in `node_modules/next/dist/docs/`). `next.config.ts` enables `cacheComponents` and `partialPrefetching`.
- **Drizzle ORM/Kit `1.0.0-rc.5`** (pre-release):
  - Relations use RQB v2 `defineRelations` in `server/db/relations.ts`. The old `relations()` helper is not used.
  - `drizzle()` takes `{ connection, relations }`, not `schema`.
  - Migrations are one folder each (`migration.sql` + `snapshot.json`). Never hand-edit snapshots.
  - The project `drizzle` skill (`.claude/skills/drizzle`) covers drizzle-kit workflows.
- **Better Auth 1.7.18:** plugins are imported from subpaths (`better-auth/plugins/admin`, `better-auth/plugins/username`).
- **shadcn/ui is the `base-nova` style on Base UI** (`@base-ui/react`), **not Radix**. Component APIs differ from Radix-based examples. The `cn` helper comes from the `cn` package (re-exported in `lib/utils.ts`). Add components with `npx shadcn@4.23.0 add <name>`.
- **All dependency versions are pinned exactly** (no `^`). Keep it that way.

## Architecture

There is no `src/` directory. `@/*` maps to the repo root.

- `app/`: routes. The plan uses route groups `(public)` for the SSR marketing site and `(dashboard)` for the client-heavy back office using TanStack Query + TanStack Form. `app/api/auth/[...all]` is the Better Auth handler. Root layout wraps everything in `QueryProvider` + `TooltipProvider` + `Toaster`, sets `lang="fr"`, PWA metadata and the viewport (safe areas, theme colors).
- `server/`: server-only code.
  - `server/db/client.ts`: Neon **WebSocket Pool** driver (`drizzle-orm/neon-serverless`). It was chosen over `neon-http` because stock and money operations need interactive transactions. The client throws at import if `DATABASE_URL` is unset.
  - `server/db/schema/*.ts`: tables, all re-exported from `schema/index.ts`, which is what `drizzle.config.ts` reads.
  - `server/auth/auth.ts`: Better Auth config. Settings: Drizzle adapter, `emailAndPassword` with **sign-up disabled**, username login, admin plugin (roles, banning = deactivation, which revokes sessions), and rate limits stored in Postgres (memory storage is useless on serverless). `nextCookies()` must stay the last plugin.
  - Planned: `server/services/*` is the only place for business logic and authorization. Each service function takes the session, checks permissions, validates with the shared Zod schema, runs in a transaction, and writes `audit_log` for money/stock changes. Route handlers and pages call services and never touch `db` directly.
- `shared/`: code imported by both server and client. `shared/auth/permissions.ts` is the **single role → permission map** (admin / reception / technician plus domain statements such as `repair:claim` and `payment:void`). It drives the admin plugin, the client (`lib/auth-client.ts`), and later `assertCan`. Change permissions here only.
- `scripts/`:
  - `migrate-on-deploy.mjs` runs inside `npm run build`. It migrates only on Vercel: always in production, and in preview only if `MIGRATE_ON_PREVIEW=1`.
  - `seed.ts` runs via `tsx`. It imports server modules dynamically *after* `loadEnvConfig`, because the db client reads env at import time.

## Front end (built, NOT yet integrated with the backend)

The whole UI runs on an in-memory demo store, so it can be integrated by swapping one layer:
- **Routes:**
  - `app/(public)`: French site with Accueil, `services`, `a-propos`, `contact`, `devis` and `suivi`.
  - `app/connexion`: login page.
  - `app/(dashboard)/tableau-de-bord/*`: the back office.
  - `app/impression/*`: print layouts (80mm `ticket`/`recu`, A4 `devis`/`facture`).
- **Data flow:** screens → `client/hooks/index.ts` (TanStack Query hooks; mutations go through `useAppMutation`, which shows the French toast and invalidates `client/query-keys.ts` roots) → `client/api.ts` → `client/mock/data.ts`. **Integration = rewrite the bodies in `client/api.ts`** to call the route handlers through `client/http.ts`. Signatures, hooks and screens stay as they are. Only `client/api.ts` may import the mock store.
- **Public pages** read data through `lib/public-content.ts` (`"use cache"` + `cacheTag("settings" | "services")`). When the backend lands, point these at the service layer and call `revalidateTag` on admin edits.
- **Demo session:** `client/session.tsx` (`useSession()` → `{ user, can }`). `can()` already uses the real permission map. The role switcher in the sidebar footer and the login form are demo-only. Replace the provider body with `authClient.useSession()` and add the server-side redirect in the dashboard layout.
- **Shared contracts:**
  - `shared/domain/types.ts`: domain types matching SPEC §3.
  - `shared/domain/labels.ts`: French labels and status tones.
  - `shared/domain/repair-flow.ts`: allowed status transitions; the service layer must enforce the same table.
  - `shared/domain/money.ts`: totals and balance.
  - `shared/schemas/*`: Zod form schemas, reusable on the server.
  - `shared/format.ts`: XOF, dates and phone formatting.
- **Forms:** `components/form/form.tsx` (`useAppForm` + field components on shadcn `Field`). Errors show inline; outcomes show as toasts.
- **Pickers:**
  - Lists that grow (products, customers, suppliers, anything from the database) use `SearchSelect` (`components/search-select.tsx`), or `f.SearchSelectField` inside forms. On desktop it's a popover with search; on phones it's a bottom sheet. Search is accent-insensitive and matches SKU/phone through `keywords`.
  - Short fixed lists (payment method, role, brand, product type, ≤ ~8 options) keep `Select` / `f.SelectField`.
  - For other Command lists, pass `filter={searchFilter}`.
- **Next 16 prerender rules (`cacheComponents`):**
  - Never read `Date`/`Date.now()` in render; use `useNow()` (`client/use-now.ts`) or `useIsClient()`.
  - Client hooks reading the URL (`useSearchParams`, `usePathname` in dynamic routes) need a `<Suspense>` boundary. The dashboard layout already wraps everything in one.
- **Layout:** responsive grids start with `grid-cols-1` (`minmax(0,1fr)`). Without it, long truncated rows overflow on phones.
- **Demo-only bits to remove at integration:** the "Démo" tracking autofill (`components/site/tracking.tsx`), the login hint, the role switcher, and the placeholder phone numbers in `client/mock/data.ts` settings.

## Design: premium, Apple-inspired

The target is an interface that feels like a polished Apple app:
- calm and restrained
- immediate response to every touch
- fluid, interruptible motion
- clear typographic hierarchy

The same bar applies to the public site and the staff dashboard. The project skills in `.claude/skills` hold the detailed rules. **Load the matching skill before writing or reviewing UI**; don't work from memory.

| Skill | Load it when |
|---|---|
| `apple-design` | Any visual or interaction work. Covers motion and springs, gestures, sheets, drag/swipe, translucent materials and depth, typography (tracking, leading), and reduced motion. This is the governing design language. |
| `emil-design-eng` | Building or polishing components and deciding *whether/how* something animates (easing, duration, origin-aware popovers, button press feedback). Use its required review format when asked to review UI. |
| `mobile-native` | Any screen used on a phone. That means the whole public site, and the technician views, which are phone-first. Covers safe areas, `dvh`, input zoom, tap highlight, sticky hover, and touch targets. |
| `ask-sonner` | Any user feedback message. |
| `shadcn` | Adding or composing shadcn/ui components (remember: Base UI, not Radix). |
| `break-ui` | Before calling a list, table, card or form done. Stress it with worst-case data: long French names, huge XOF amounts, zero items, missing fields. |

**Project rules that apply on top of the skills:**
- **Feedback uses Sonner.** Use `toast.success(...)` / `toast.error(...)` with short French messages. For async mutations (TanStack Query) use `toast.promise(...)`, or toast in `onSuccess` / `onError`. There is one `<Toaster />` (`components/ui/sonner.tsx`, styled from theme tokens, top-center) in the root layout; never mount another. `toast()` is client-only, so server code returns a result and the client shows the toast. Inline field errors stay in the form (TanStack Form + Zod); toasts are for outcomes.
- **Restraint first.** Use neutral surfaces, generous whitespace, and one accent colour. Express hierarchy through type size, weight and spacing, not borders and boxes. Don't add decoration (gradients, heavy shadows, emoji) that the content doesn't need.
- **Motion has a purpose.** Interactions respond immediately on press. Use springs or short ease-out transitions, never animate from `scale(0)`, and keep motion interruptible. Every animation needs a `prefers-reduced-motion` fallback (a cross-fade or nothing).
- **Phone is a first-class target, not a breakpoint afterthought.**
  - Touch targets are at least 44px.
  - Inputs use font-size ≥ 16px so iOS doesn't zoom.
  - Gate hover styles with `@media (hover: hover)`.
  - Respect safe areas (`env(safe-area-inset-*)`).
  - Never disable pinch-zoom.
  - Check on a real phone before calling a mobile screen done.
- **Theme lives in tokens.** Change colours, radii and fonts through the CSS variables in `app/globals.css` (shadcn tokens), not one-off Tailwind values, so the look stays consistent.

## Domain conventions

- **Staff:**
  - Staff log in by **username**. Better Auth still requires an email, so staff without one get the placeholder `<username>@staff.invalid`.
  - Accounts are created only by an admin (`auth.api.createUser` / admin plugin) or by the seed. Default role is `technician`.
- **Money:** integer XOF, no decimals. Format only in the UI.
- **Timestamps:** `timestamp(..., { withTimezone: true })`. The shop is in Africa/Bamako (UTC+0).
- **Branches:** single shop, but location-bound tables carry `branch_id` (`branches` table, one seeded row) so multi-branch needs no migration later.
- **Deletion:** money and stock records are never hard-deleted. Use void with a reason plus reversing movements; only admin can void.
- **Language:** UI copy is French and hardcoded (no i18n layer, by decision).

## Environments

- **Neon project:** `shalom-services`, AWS us-east-1.
  - Branch `main` is **production**, managed by the Vercel integration.
  - Branch `dev` is what `.env.local` points to.
  - Never run ad-hoc writes against `main`.
- **Env vars:** `DATABASE_URL` (pooled, app), `DATABASE_URL_UNPOOLED` (direct, drizzle-kit/migrations), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `SEED_ADMIN_*` (see `.env.example`).
- **Vercel:** production is `shalom-services-azure.vercel.app`, function region `iad1`. A missing `BETTER_AUTH_SECRET` in production makes Better Auth refuse to run.
- **Migrations ship with the code:** the production build applies them before the new deployment goes live. Keep them backward compatible with the running code (add nullable/defaulted columns; drop/rename in a later release).
