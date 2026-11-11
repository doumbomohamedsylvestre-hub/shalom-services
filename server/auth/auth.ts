import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins/admin";
import { username } from "better-auth/plugins/username";
import { ac, roles } from "../../shared/auth/permissions";
import { PASSWORD_MAX, PASSWORD_MIN, USERNAME_PATTERN } from "../../shared/schemas/staff";
import { db } from "../db/client";
import * as schema from "../db/schema";

// Vercel exposes the deployment host without a scheme. Used for preview URLs,
// where BETTER_AUTH_URL (set for production / local) does not apply.
const vercelOrigins = [
  process.env.VERCEL_URL,
  process.env.VERCEL_BRANCH_URL,
  process.env.VERCEL_PROJECT_PRODUCTION_URL,
]
  .filter(Boolean)
  .map((host) => `https://${host}`);

export const auth = betterAuth({
  appName: "Shalom Services",
  // BETTER_AUTH_URL wins when set; otherwise fall back to the Vercel deployment URL.
  ...(process.env.BETTER_AUTH_URL ? {} : vercelOrigins[0] ? { baseURL: vercelOrigins[0] } : {}),
  trustedOrigins: vercelOrigins,

  database: drizzleAdapter(db, { provider: "pg", schema }),

  // Staff only: no public sign-up. Accounts are created by an admin
  // (admin plugin `createUser`) or by `npm run db:seed` for the first admin.
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: PASSWORD_MIN,
    maxPasswordLength: PASSWORD_MAX,
  },

  session: {
    // Shared shop computers: a week of inactivity signs staff out.
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },

  // Persist rate-limit counters in Postgres: in-memory limits reset on every
  // serverless cold start, so they would not protect anything on Vercel.
  rateLimit: {
    enabled: true,
    storage: "database",
  },

  advanced: {
    ipAddress: { ipAddressHeaders: ["x-forwarded-for"] },
  },

  plugins: [
    // Login is by username (staff may have no email address).
    // Same rule as the staff form (shared/schemas/staff.ts), checked after lowercasing.
    username({
      usernameValidator: (value) => USERNAME_PATTERN.test(value),
      validationOrder: { username: "post-normalization" },
    }),
    // Roles + staff management; banning a user revokes all their sessions.
    admin({
      ac,
      roles,
      defaultRole: "technician",
      adminRoles: ["admin"],
      bannedUserMessage: "Ce compte a été désactivé. Contactez l'administrateur.",
    }),
    // Must stay last: lets server actions set auth cookies.
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
