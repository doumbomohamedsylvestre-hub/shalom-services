import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/admin/access";

/**
 * Single role -> permission map for the whole app (docs/SPEC.md §1).
 * Used by Better Auth's admin plugin on the server, by the auth client for
 * UI gating, and later by the service layer (`assertCan`).
 *
 * `user` / `session` are Better Auth's own statements (staff management).
 * The rest are ShalomServices domain permissions.
 */
export const statements = {
  ...defaultStatements,
  customer: ["create", "read", "update"],
  repair: ["create", "read", "update", "assign", "claim", "set-status", "quote-decision"],
  inventory: ["read", "receive", "adjust"],
  supplier: ["read", "manage"],
  sale: ["create", "read"],
  payment: ["create", "read", "void"],
  expense: ["create", "read", "void", "manage-categories"],
  inquiry: ["read", "update", "convert"],
  report: ["read"],
  settings: ["read", "update"],
  audit: ["read"],
} as const;

export const ac = createAccessControl(statements);

/** Owner: everything, including staff management, finances, voids and reports. */
export const admin = ac.newRole({
  user: ["create", "list", "set-role", "ban", "delete", "set-password", "get", "update"],
  session: ["list", "revoke", "delete"],
  customer: ["create", "read", "update"],
  repair: ["create", "read", "update", "assign", "claim", "set-status", "quote-decision"],
  inventory: ["read", "receive", "adjust"],
  supplier: ["read", "manage"],
  sale: ["create", "read"],
  payment: ["create", "read", "void"],
  expense: ["create", "read", "void", "manage-categories"],
  inquiry: ["read", "update", "convert"],
  report: ["read"],
  settings: ["read", "update"],
  audit: ["read"],
});

/** Counter staff: intake, sales, payments, expense entry, inbox. No reports, voids or staff management. */
export const reception = ac.newRole({
  customer: ["create", "read", "update"],
  repair: ["create", "read", "update", "assign", "set-status", "quote-decision"],
  inventory: ["read", "receive"],
  supplier: ["read"],
  sale: ["create", "read"],
  payment: ["create", "read"],
  expense: ["create"],
  inquiry: ["read", "update", "convert"],
  settings: ["read"],
});

/** Technicians: the repair queue and their own repairs. No money views. */
export const technician = ac.newRole({
  customer: ["read"],
  repair: ["read", "update", "claim", "set-status"],
  inventory: ["read"],
});

export const roles = { admin, reception, technician };
export type Role = keyof typeof roles;
export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrateur",
  reception: "Réception",
  technician: "Technicien",
};
