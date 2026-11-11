import { beforeAll, describe, expect, it } from "vitest";
import type { StaffSession } from "@/server/auth/session";
import { expectAppError, hasDb, staff, uniq } from "./helpers";

describe.skipIf(!hasDb)("stock and counter sales (SPEC §2.5, §2.6, §3 invariants)", async () => {
  const inv = await import("@/server/services/inventory");
  const salesSvc = await import("@/server/services/sales");
  let admin: StaffSession, reception: StaffSession, tech: StaffSession;
  let supplierId: string;
  let productId: string;
  const sku = `T-${uniq()}`;

  beforeAll(async () => {
    [admin, reception, tech] = await Promise.all([staff("admin"), staff("reception", "Caissière Test"), staff("technician")]);
    const [category] = await inv.listProductCategories(admin);
    const p = await inv.saveProduct(admin, { sku, name: `Produit ${sku}`, kind: "accessory", category: category!, salePrice: 3000, minQty: 1, active: true });
    productId = p.id;
    const s = await inv.saveSupplier(admin, { name: `Fournisseur ${uniq()}`, phone: "", contact: "", notes: "" });
    supplierId = s.id;
  });

  const product = async () => (await inv.listProducts(admin)).find((p) => p.id === productId)!;

  it("a receipt raises stock and recalculates the weighted average cost", async () => {
    await inv.receiveStock(reception, { supplierId, lines: [{ productId, qty: 6, unitCost: 1000 }], amountPaid: 6000, note: "" });
    await inv.receiveStock(reception, { supplierId, lines: [{ productId, qty: 4, unitCost: 1500 }], amountPaid: 6000, note: "" });
    const p = await product();
    expect(p.qtyOnHand).toBe(10);
    expect(p.avgCost).toBe(1200);
  });

  it("stock never goes below zero", async () => {
    await expectAppError(inv.adjustStock(admin, { productId, qtyDelta: -11, reason: "casse totale" }), "NEGATIVE_STOCK");
    expect((await product()).qtyOnHand).toBe(10);
  });

  it("only the admin adjusts stock", async () => {
    await expectAppError(inv.adjustStock(reception, { productId, qtyDelta: -1, reason: "casse" }), "FORBIDDEN");
  });

  it("prices come from the catalogue and payments must cover the total exactly", async () => {
    const line = { kind: "product" as const, refId: productId, label: "x", qty: 2, unitPrice: 1, discount: 0 };
    await expectAppError(salesSvc.createSale(reception, { lines: [line], payments: [{ amount: 2, method: "cash" }] }), "PAYMENT_MISMATCH");
    const sale = await salesSvc.createSale(reception, { lines: [{ ...line, discount: 500 }], payments: [{ amount: 5500, method: "cash" }] });
    expect(sale.lines[0]!.unitPrice).toBe(3000);
    expect(sale.lines[0]!.discountBy).toBe("Caissière Test");
    expect((await product()).qtyOnHand).toBe(8);
  });

  it("a discount larger than the line is refused", async () => {
    await expectAppError(
      salesSvc.createSale(reception, { lines: [{ kind: "product", refId: productId, label: "x", qty: 1, unitPrice: 3000, discount: 3001 }], payments: [{ amount: 1, method: "cash" }] }),
      "DISCOUNT_TOO_HIGH",
    );
  });

  it("sale numbers are sequential and gap-free", async () => {
    const line = { kind: "product" as const, refId: productId, label: "x", qty: 1, unitPrice: 3000, discount: 0 };
    const a = await salesSvc.createSale(reception, { lines: [line], payments: [{ amount: 3000, method: "cash" }] });
    const b = await salesSvc.createSale(reception, { lines: [line], payments: [{ amount: 3000, method: "orange_money" }] });
    expect(Number(b.number.split("-")[1])).toBe(Number(a.number.split("-")[1]) + 1);
  });

  it("two concurrent sales cannot oversell the last unit", async () => {
    const left = (await product()).qtyOnHand;
    await inv.adjustStock(admin, { productId, qtyDelta: 1 - left, reason: "préparation du test" });
    const line = { kind: "product" as const, refId: productId, label: "x", qty: 1, unitPrice: 3000, discount: 0 };
    const results = await Promise.allSettled([
      salesSvc.createSale(reception, { lines: [line], payments: [{ amount: 3000, method: "cash" }] }),
      salesSvc.createSale(reception, { lines: [line], payments: [{ amount: 3000, method: "cash" }] }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await product()).qtyOnHand).toBe(0);
  });

  it("voiding a sale is admin-only, restocks and voids its payments", async () => {
    const [last] = await salesSvc.listSales(admin);
    await expectAppError(salesSvc.voidSale(reception, last!.id, { reason: "erreur de caisse" }), "FORBIDDEN");
    const voided = await salesSvc.voidSale(admin, last!.id, { reason: "erreur de caisse" });
    expect(voided.voided?.reason).toBe("erreur de caisse");
    expect(voided.payments.every((p) => p.voided)).toBe(true);
    expect((await product()).qtyOnHand).toBe(1);
    await expectAppError(salesSvc.voidSale(admin, last!.id, { reason: "erreur de caisse" }), "ALREADY_VOIDED");
  });

  it("a receipt whose units were already sold cannot be voided", async () => {
    const [receipt] = await inv.listReceipts(admin);
    await expectAppError(inv.voidReceipt(admin, receipt!.id, { reason: "livraison erronée" }), "STOCK_ALREADY_USED");
  });

  it("a fresh receipt can be voided: units leave at the current average cost", async () => {
    await inv.receiveStock(reception, { supplierId, lines: [{ productId, qty: 5, unitCost: 2000 }], amountPaid: 0, note: "à annuler" });
    const before = await product();
    const [receipt] = await inv.listReceipts(admin);
    const voided = await inv.voidReceipt(admin, receipt!.id, { reason: "livraison erronée" });
    expect(voided.voided).toBeDefined();
    const after = await product();
    expect(after.qtyOnHand).toBe(before.qtyOnHand - 5);
    expect(after.avgCost).toBe(before.avgCost);
  });

  it("an inactive product cannot be sold or received", async () => {
    const p = await product();
    await inv.saveProduct(admin, { sku, name: p.name, kind: "accessory", category: p.category, salePrice: 3000, minQty: 1, active: false }, productId);
    await expectAppError(
      salesSvc.createSale(reception, { lines: [{ kind: "product", refId: productId, label: "x", qty: 1, unitPrice: 3000, discount: 0 }], payments: [{ amount: 3000, method: "cash" }] }),
      "INACTIVE_PRODUCT",
    );
    await expectAppError(inv.receiveStock(reception, { supplierId, lines: [{ productId, qty: 1, unitCost: 1000 }], amountPaid: 0, note: "" }), "INACTIVE_PRODUCT");
  });

  it("technicians see products but not costs, and cannot sell", async () => {
    const p = (await inv.listProducts(tech)).find((x) => x.id === productId)!;
    expect(p.avgCost).toBe(0);
    await expectAppError(salesSvc.listSales(tech), "FORBIDDEN");
  });
});
