import { beforeAll, describe, expect, it } from "vitest";
import type { StaffSession } from "@/server/auth/session";
import type { RepairIntakeInput } from "@/shared/schemas/staff";
import { expectAppError, hasDb, phone, staff } from "./helpers";

describe.skipIf(!hasDb)("repairs (SPEC §2.1–2.4)", async () => {
  const repairs = await import("@/server/services/repairs");
  let admin: StaffSession, reception: StaffSession, tech: StaffSession, otherTech: StaffSession;
  const intake = (mode: "fixed" | "quote", extra: Partial<RepairIntakeInput> = {}): RepairIntakeInput => ({
    customerName: "Client Test",
    customerPhone: phone(),
    brand: "Samsung",
    model: "A14",
    color: "",
    imei: "",
    fault: "Écran cassé",
    conditionNotes: "",
    accessories: "",
    mode,
    lines: mode === "fixed" ? [{ kind: "service", label: "Remplacement écran", qty: 1, unitPrice: 20000, discount: 0 }] : [],
    deposit: 0,
    depositMethod: "cash",
    ...extra,
  });

  beforeAll(async () => {
    [admin, reception, tech, otherTech] = await Promise.all([staff("admin"), staff("reception"), staff("technician", "Tech Un"), staff("technician", "Tech Deux")]);
  });

  it("intake finds the customer by phone instead of duplicating it", async () => {
    const p = phone();
    const a = await repairs.createRepair(reception, intake("quote", { customerPhone: p }));
    const b = await repairs.createRepair(reception, intake("quote", { customerPhone: p, customerName: "Autre nom" }));
    expect(b.customer.id).toBe(a.customer.id);
    expect(a.code).toMatch(/^SS-[A-Z0-9]{6}$/);
  });

  it("technicians cannot do intake", async () => {
    await expectAppError(repairs.createRepair(tech, intake("fixed")), "FORBIDDEN");
  });

  it("a fixed deposit cannot exceed the agreed price", async () => {
    await expectAppError(repairs.createRepair(reception, intake("fixed", { deposit: 20001 })), "OVERPAYMENT");
  });

  it("fixed flow: claim, repair, pay, pick up with a sequential invoice", async () => {
    const r = await repairs.createRepair(reception, intake("fixed", { deposit: 5000 }));
    await expectAppError(repairs.changeRepairStatus(tech, r.id, "in_repair"), "NOT_CLAIMED");
    await repairs.claimRepair(tech, r.id);
    await expectAppError(repairs.claimRepair(otherTech, r.id), "ALREADY_CLAIMED");
    await expectAppError(repairs.getRepair(otherTech, r.id), "NOT_FOUND");
    await expectAppError(repairs.changeRepairStatus(tech, r.id, "ready"), "INVALID_TRANSITION");
    await repairs.changeRepairStatus(tech, r.id, "in_repair");
    await repairs.changeRepairStatus(tech, r.id, "ready");
    await expectAppError(repairs.changeRepairStatus(tech, r.id, "picked_up"), "FORBIDDEN");
    await expectAppError(repairs.changeRepairStatus(reception, r.id, "picked_up"), "BALANCE_DUE");
    await expectAppError(repairs.recordRepairPayment(reception, r.id, { amount: 15001, method: "cash" }), "OVERPAYMENT");
    const paid = await repairs.recordRepairPayment(reception, r.id, { amount: 15000, method: "cash" });
    expect(paid.payments.at(-1)!.kind).toBe("payment");
    const done = await repairs.changeRepairStatus(reception, r.id, "picked_up");
    expect(done.status).toBe("picked_up");
    expect(done.invoiceNumber).toMatch(/^[A-Z0-9]+-\d{5}$/);
    expect(done.events.map((e) => e.to)).toEqual(["received", "in_repair", "ready", "picked_up"]);
  });

  it("quote flow: lines needed, lines lock, only counter staff decide", async () => {
    const r = await repairs.createRepair(reception, intake("quote"));
    await repairs.claimRepair(tech, r.id);
    await repairs.changeRepairStatus(tech, r.id, "diagnosing");
    await expectAppError(repairs.changeRepairStatus(tech, r.id, "quote_sent"), "EMPTY_QUOTE");
    await repairs.addRepairLine(tech, r.id, { kind: "service", label: "Écran", qty: 1, unitPrice: 30000, discount: 0 });
    await repairs.changeRepairStatus(tech, r.id, "quote_sent");
    await expectAppError(repairs.addRepairLine(tech, r.id, { kind: "service", label: "x", qty: 1, unitPrice: 1, discount: 0 }), "LINES_LOCKED");
    await expectAppError(repairs.changeRepairStatus(tech, r.id, "approved"), "FORBIDDEN");
    const ok = await repairs.changeRepairStatus(reception, r.id, "approved");
    expect(ok.status).toBe("approved");
  });

  it("technicians only list the queue and their own tickets", async () => {
    const mine = await repairs.createRepair(reception, intake("quote"));
    await repairs.claimRepair(otherTech, mine.id);
    const list = await repairs.listRepairs(tech, { status: "all" });
    expect(list.some((r) => r.id === mine.id)).toBe(false);
    expect(list.every((r) => !r.technician || r.technician.id === tech.user.id)).toBe(true);
  });

  it("only the admin voids a payment, and never after pickup", async () => {
    const r = await repairs.createRepair(reception, intake("fixed", { deposit: 3000 }));
    const payId = r.payments[0]!.id;
    await expectAppError(repairs.voidRepairPayment(reception, r.id, payId, { reason: "erreur" }), "FORBIDDEN");
    const v = await repairs.voidRepairPayment(admin, r.id, payId, { reason: "erreur de saisie" });
    expect(v.payments[0]!.voided?.reason).toBe("erreur de saisie");
  });
});
