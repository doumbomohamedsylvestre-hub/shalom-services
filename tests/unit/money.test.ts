import { describe, expect, it } from "vitest";
import { balanceDue, lineTotal, linesTotal, paidTotal } from "@/shared/domain/money";
import type { LineItem, Payment } from "@/shared/domain/types";

const line = (qty: number, unitPrice: number, discount = 0): LineItem => ({ id: "l", kind: "product", label: "x", qty, unitPrice, discount });
const pay = (amount: number, voided = false): Payment => ({
  id: "p",
  amount,
  method: "cash",
  kind: "payment",
  receivedBy: "a",
  at: "",
  ...(voided && { voided: { at: "", by: "a", reason: "r" } }),
});

describe("totals and discounts", () => {
  it("applies the per-line discount", () => {
    expect(lineTotal(line(2, 2000, 500))).toBe(3500);
  });
  it("never goes below zero", () => {
    expect(lineTotal(line(1, 1000, 5000))).toBe(0);
  });
  it("sums lines", () => {
    expect(linesTotal([line(1, 10000, 1000), line(1, 12000)])).toBe(21000);
  });
  it("ignores voided payments", () => {
    expect(paidTotal([pay(5000), pay(16000, true)])).toBe(5000);
  });
  it("computes the balance and clamps an overpayment to 0", () => {
    expect(balanceDue([line(1, 21000)], [pay(5000)])).toBe(16000);
    expect(balanceDue([line(1, 1000)], [pay(5000)])).toBe(0);
  });
});
