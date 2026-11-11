import { describe, expect, it } from "vitest";
import { roles, type Role } from "@/shared/auth/permissions";

type Statements = Parameters<(typeof roles)["admin"]["authorize"]>[0];
const can = (role: Role, p: Statements) => roles[role].authorize(p).success;

describe("role → permission map (SPEC §1)", () => {
  it("admin can do everything sensitive", () => {
    expect(can("admin", { payment: ["void"], report: ["read"], user: ["create", "ban"], settings: ["update"], audit: ["read"] })).toBe(true);
  });

  it("reception runs the counter but cannot void, report or manage staff", () => {
    expect(can("reception", { sale: ["create"], payment: ["create"], repair: ["create", "assign", "quote-decision"], expense: ["create"] })).toBe(true);
    expect(can("reception", { payment: ["void"] })).toBe(false);
    expect(can("reception", { expense: ["read"] })).toBe(false);
    expect(can("reception", { report: ["read"] })).toBe(false);
    expect(can("reception", { user: ["list"] })).toBe(false);
    expect(can("reception", { settings: ["update"] })).toBe(false);
  });

  it("technicians work on repairs only, with no money views", () => {
    expect(can("technician", { repair: ["claim", "set-status", "update"], inventory: ["read"] })).toBe(true);
    expect(can("technician", { repair: ["create"] })).toBe(false);
    expect(can("technician", { repair: ["quote-decision"] })).toBe(false);
    expect(can("technician", { payment: ["create"] })).toBe(false);
    expect(can("technician", { sale: ["read"] })).toBe(false);
    expect(can("technician", { report: ["read"] })).toBe(false);
  });

  it("only the admin voids anything", () => {
    for (const role of ["reception", "technician"] as Role[]) {
      expect(can(role, { payment: ["void"] })).toBe(false);
      expect(can(role, { expense: ["void"] })).toBe(false);
      expect(can(role, { inventory: ["adjust"] })).toBe(false);
    }
  });
});
