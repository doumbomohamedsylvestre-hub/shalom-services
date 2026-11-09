# Deploying to Vercel

The project needs no `vercel.json`: Vercel detects Next.js and runs `npm run build`.

## What `npm run build` does on Vercel

1. `scripts/migrate-on-deploy.mjs` applies any pending Drizzle migrations in `drizzle/`.
   - **Production:** always runs. The build fails if the database URL is missing or a migration fails, so broken schema never goes live.
   - **Preview:** skipped unless `MIGRATE_ON_PREVIEW=1`.
   - **Locally:** skipped. Use `npm run db:migrate` instead.
   - No migrations yet: skipped.
2. `next build` builds the app.

## First-time setup

1. **Import the repo.** In Vercel, go to *Add New → Project* and import `doumbomohamedsylvestre-hub/shalom-services` (branch `main`). Keep the detected Next.js preset and the default build and output settings.
2. **Database.** Use one of these options:
   - **Recommended:** *Storage → Neon* (Vercel Marketplace) on the project. It sets `DATABASE_URL` and `DATABASE_URL_UNPOOLED`, and can create a Neon branch per preview deployment. If you turn per-preview branches on, also set `MIGRATE_ON_PREVIEW=1` for the **Preview** environment.
   - **Otherwise:** add `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct) by hand under *Settings → Environment Variables*. Leave `MIGRATE_ON_PREVIEW` unset so previews never migrate production.
3. **Function region.** Under *Settings → Functions → Region*, pick the region next to the Neon database. For example, use `iad1` for Neon `aws-us-east-1` and `fra1` for `aws-eu-central-1`. Each query crosses this link, so a mismatch makes every page slower.
4. **Node.js version.** Under *Settings → General → Node.js Version*, use 22.x or newer. The Neon driver relies on the built-in `WebSocket`.
5. **Plan.** The Hobby plan is for non-commercial use only. A business site needs **Pro**.
6. **Domain.** Add the shop's domain under *Settings → Domains*.

## Environment variables

| Name | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | All | Pooled Neon URL used by the app |
| `DATABASE_URL_UNPOOLED` | All | Direct Neon URL used for migrations |
| `MIGRATE_ON_PREVIEW` | Preview only, optional | `1` = run migrations on preview builds (only with a Neon branch per preview) |

As features land (Better Auth, storage), their variables are added to `.env.example` and to this table.

## Releasing schema changes

1. Change `server/db/schema/*`, then run `npm run db:generate`. Review `drizzle/<timestamp>_<name>/migration.sql`.
2. Commit the migration with the code that needs it.
3. Merging to `main` deploys production, and the migration runs before the new code goes live.

Migrations must stay backward compatible with the code currently running, because the old deployment keeps serving traffic until the new one is promoted. Add columns as nullable or with a default. Drop or rename in a later release.
