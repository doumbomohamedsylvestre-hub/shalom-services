/**
 * The front end's only data access layer.
 *
 * Every function returns plain domain types (shared/domain/types).
 * Live (route handlers via client/http.ts): staff, settings and services,
 * customers, stock, suppliers, sales, expenses, audit log.
 * Still demo (client/mock/data): repairs, inquiries, public tracking, reports.
 * Integration = replace a body with an `http` call; signatures stay the same,
 * so hooks and screens do not change.
 */
import * as db from "@/client/mock/data";
import { linesTotal, paidTotal } from "@/shared/domain/money";
import { OPEN_STATUSES } from "@/shared/domain/labels";
import { nextStatuses } from "@/shared/domain/repair-flow";
import type {
  AuditEntry,
  Customer,
  DashboardSummary,
  Expense,
  ExpenseCategory,
  Inquiry,
  InquiryStatus,
  Payment,
  Product,
  Repair,
  RepairStatus,
  ReportData,
  ReportRange,
  Sale,
  Service,
  ShopSettings,
  StaffUser,
  StockMovement,
  Supplier,
  TrackingResult,
} from "@/shared/domain/types";
import type { InquiryInput, TrackingInput } from "@/shared/schemas/public";
import type {
  CustomerInput,
  ExpenseInput,
  LineInput,
  PaymentInput,
  ProductInput,
  RepairIntakeInput,
  SaleInput,
  ServiceInput,
  SettingsInput,
  StaffUpdateInput,
  StaffUserInput,
  StockAdjustmentInput,
  StockReceiptInput,
  SupplierInput,
} from "@/shared/schemas/staff";
import { normalizeMaliPhone } from "@/shared/phone";

import { ApiError, http } from "@/client/http";

export { ApiError };

const latency = (ms = 350) => new Promise((r) => setTimeout(r, ms + Math.random() * 250));
const clone = <T,>(v: T): T => structuredClone(v);
const nowISO = () => new Date().toISOString();
// Name stamped on records the demo store still creates (repairs, sales, stock…).
// Set from the real session by <SessionProvider>; the server will derive it itself.
let ACTOR = "Équipe";
export function setMockActor(name: string) {
  ACTOR = name;
}

function findRepair(id: string) {
  const r = db.repairs.find((x) => x.id === id);
  if (!r) throw new ApiError("NOT_FOUND", "Réparation introuvable.");
  return r;
}

function audit(action: string, entity: string, entityRef: string, summary: string) {
  db.audit.unshift({ id: db.newId("aud"), actor: ACTOR, action, entity, entityRef, summary, at: nowISO() });
}

// ───────────────────────────── Public site ─────────────────────────────

export const getSettings = () => http.get<ShopSettings>("/api/settings");

export const getServices = (opts: { publicOnly?: boolean } = {}) =>
  http.get<Service[]>(`/api/services${opts.publicOnly ? "?public=1" : ""}`);

export async function submitInquiry(input: InquiryInput): Promise<{ id: string }> {
  await latency(700);
  if (input.website) return { id: "ignored" }; // honeypot: pretend success
  const inquiry: Inquiry = {
    id: db.newId("inq"),
    type: input.type,
    name: input.name,
    phone: normalizeMaliPhone(input.phone) ?? input.phone,
    device: input.device || undefined,
    message: input.message,
    status: "new",
    createdAt: nowISO(),
  };
  db.inquiries.unshift(inquiry);
  return { id: inquiry.id };
}

export async function trackRepair(input: TrackingInput): Promise<TrackingResult> {
  await latency(600);
  const phone = normalizeMaliPhone(input.phone);
  const r = db.repairs.find((x) => x.code === input.code.toUpperCase());
  if (!r || r.customer.phone !== phone) {
    // Same message for "unknown code" and "wrong phone": no enumeration.
    throw new ApiError("NOT_FOUND", "Aucune réparation ne correspond à ce code et ce numéro.");
  }
  const [first, ...rest] = r.customer.name.split(" ");
  return {
    code: r.code,
    maskedName: `${first} ${rest.map((p) => `${p[0]}.`).join(" ")}`.trim(),
    device: `${r.device.brand} ${r.device.model}`,
    status: r.status,
    estimatedReadyAt: r.estimatedReadyAt,
    timeline: r.events.map((e) => ({ status: e.to, at: e.at })),
  };
}

/** Demo helper for the tracking page: a real code + phone to try. */
export async function getTrackingExample() {
  const r = db.repairs.find((x) => x.status === "in_repair") ?? db.repairs[0]!;
  return { code: r.code, phone: r.customer.phone };
}

// ───────────────────────────── Dashboard ─────────────────────────────

export async function getDashboardSummary(): Promise<DashboardSummary> {
  // Boutique figures are live; repair figures stay demo until the repairs phase.
  const boutique = await http.get<{ lowStock: number; todaySales: number; monthSales: number }>("/api/dashboard/boutique");
  const open = db.repairs.filter((r) => OPEN_STATUSES.includes(r.status));
  const today = new Date().toDateString();
  const monthStart = Date.now() - 30 * 86400_000;
  const repairPayments = db.repairs.flatMap((r) => r.payments).filter((p) => !p.voided);
  return {
    openRepairs: open.length,
    readyForPickup: open.filter((r) => r.status === "ready").length,
    overdue: open.filter((r) => r.estimatedReadyAt && new Date(r.estimatedReadyAt).getTime() < Date.now() && r.status !== "ready").length,
    unclaimed: open.filter((r) => !r.technician).length,
    todayRevenue: boutique.todaySales + repairPayments.filter((p) => new Date(p.at).toDateString() === today).reduce((s, p) => s + p.amount, 0),
    monthRevenue: boutique.monthSales + repairPayments.filter((p) => new Date(p.at).getTime() > monthStart).reduce((s, p) => s + p.amount, 0),
    lowStock: boutique.lowStock,
    newInquiries: db.inquiries.filter((i) => i.status === "new").length,
  };
}

// Repairs

export type RepairFilters = {
  q?: string;
  status?: RepairStatus | "open" | "all";
  technicianId?: string | "unclaimed";
};

export async function listRepairs(f: RepairFilters = {}): Promise<Repair[]> {
  await latency();
  const q = f.q?.trim().toLowerCase();
  return clone(
    db.repairs
      .filter((r) =>
        !f.status || f.status === "all" ? true : f.status === "open" ? OPEN_STATUSES.includes(r.status) : r.status === f.status,
      )
      .filter((r) =>
        !f.technicianId ? true : f.technicianId === "unclaimed" ? !r.technician : r.technician?.id === f.technicianId,
      )
      .filter((r) =>
        !q
          ? true
          : [r.code, r.customer.name, r.customer.phone, r.device.brand, r.device.model].some((v) => v.toLowerCase().includes(q)),
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  );
}

export async function getRepair(id: string): Promise<Repair> {
  await latency(250);
  return clone(findRepair(id));
}

export async function createRepair(input: RepairIntakeInput): Promise<Repair> {
  await latency(800);
  const phone = normalizeMaliPhone(input.customerPhone)!;
  let customer = db.customers.find((c) => c.id === input.customerId || c.phone === phone);
  if (!customer) {
    customer = { id: db.newId("cus"), name: input.customerName, phone, createdAt: nowISO(), repairsCount: 0, totalSpent: 0 };
    db.customers.unshift(customer);
  }
  customer.repairsCount += 1;
  const at = nowISO();
  const payments: Payment[] =
    input.deposit > 0
      ? [{ id: db.newId("pay"), amount: input.deposit, method: input.depositMethod, kind: "deposit", receivedBy: ACTOR, at }]
      : [];
  const repair: Repair = {
    id: db.newId("rep"),
    code: db.newCode(),
    customer: { id: customer.id, name: customer.name, phone: customer.phone },
    device: { brand: input.brand, model: input.model, color: input.color || undefined, imei: input.imei || undefined },
    fault: input.fault,
    conditionNotes: input.conditionNotes || undefined,
    accessories: input.accessories || undefined,
    mode: input.mode,
    status: "received",
    lines: input.lines.map((l) => ({ ...l, id: db.newId("lin"), discountBy: l.discount ? ACTOR : undefined })),
    payments,
    events: [{ id: db.newId("evt"), from: null, to: "received", by: ACTOR, at }],
    estimatedReadyAt: input.estimatedReadyAt || undefined,
    createdAt: at,
    updatedAt: at,
  };
  db.repairs.unshift(repair);
  audit("create", "Réparation", repair.code, `Ticket créé pour ${customer.name}.`);
  return clone(repair);
}

export async function claimRepair(id: string, technician: { id: string; name: string }): Promise<Repair> {
  await latency();
  const r = findRepair(id);
  if (r.technician && r.technician.id !== technician.id) throw new ApiError("ALREADY_CLAIMED", "Déjà pris en charge par un autre technicien.");
  r.technician = technician;
  r.updatedAt = nowISO();
  return clone(r);
}

export async function assignRepair(id: string, technician: { id: string; name: string } | null): Promise<Repair> {
  await latency();
  const r = findRepair(id);
  r.technician = technician ?? undefined;
  r.updatedAt = nowISO();
  return clone(r);
}

export async function changeRepairStatus(id: string, to: RepairStatus, note?: string): Promise<Repair> {
  await latency();
  const r = findRepair(id);
  if (!nextStatuses(r.mode, r.status).includes(to)) throw new ApiError("INVALID_TRANSITION", "Ce changement de statut n'est pas autorisé.");
  if (to === "picked_up" && linesTotal(r.lines) - paidTotal(r.payments) > 0) {
    throw new ApiError("BALANCE_DUE", "Le solde doit être réglé avant la remise de l'appareil.");
  }
  r.events.push({ id: db.newId("evt"), from: r.status, to, by: ACTOR, at: nowISO(), note });
  r.status = to;
  r.updatedAt = nowISO();
  return clone(r);
}

export async function updateRepairDiagnosis(id: string, diagnosis: string): Promise<Repair> {
  await latency();
  const r = findRepair(id);
  r.diagnosis = diagnosis;
  r.updatedAt = nowISO();
  return clone(r);
}

export async function addRepairLine(id: string, line: LineInput): Promise<Repair> {
  await latency();
  const r = findRepair(id);
  if (line.kind === "product" && line.refId) {
    const p = db.products.find((x) => x.id === line.refId);
    if (p) {
      if (p.qtyOnHand < line.qty) throw new ApiError("OUT_OF_STOCK", `Stock insuffisant pour ${p.name}.`);
      p.qtyOnHand -= line.qty;
      db.movements.unshift({ id: db.newId("mov"), productId: p.id, productName: p.name, type: "repair_use", qtyDelta: -line.qty, unitCost: p.avgCost, ref: r.code, by: ACTOR, at: nowISO() });
    }
  }
  r.lines.push({ ...line, id: db.newId("lin"), discountBy: line.discount ? ACTOR : undefined });
  r.updatedAt = nowISO();
  return clone(r);
}

export async function removeRepairLine(id: string, lineId: string): Promise<Repair> {
  await latency();
  const r = findRepair(id);
  const line = r.lines.find((l) => l.id === lineId);
  if (line?.kind === "product" && line.refId) {
    const p = db.products.find((x) => x.id === line.refId);
    if (p) {
      p.qtyOnHand += line.qty;
      db.movements.unshift({ id: db.newId("mov"), productId: p.id, productName: p.name, type: "void", qtyDelta: line.qty, unitCost: p.avgCost, ref: r.code, by: ACTOR, at: nowISO(), reason: "Ligne retirée" });
    }
  }
  r.lines = r.lines.filter((l) => l.id !== lineId);
  r.updatedAt = nowISO();
  return clone(r);
}

export async function recordRepairPayment(id: string, input: PaymentInput): Promise<Repair> {
  await latency();
  const r = findRepair(id);
  const due = linesTotal(r.lines) - paidTotal(r.payments);
  if (input.amount > due) throw new ApiError("OVERPAYMENT", "Le montant dépasse le solde restant.");
  r.payments.push({ id: db.newId("pay"), amount: input.amount, method: input.method, kind: r.status === "ready" ? "payment" : "deposit", receivedBy: ACTOR, at: nowISO() });
  r.updatedAt = nowISO();
  audit("create", "Paiement", r.code, `Paiement de ${input.amount} FCFA.`);
  return clone(r);
}

export async function voidPayment(repairId: string, paymentId: string, reason: string): Promise<Repair> {
  await latency();
  const r = findRepair(repairId);
  const p = r.payments.find((x) => x.id === paymentId);
  if (p) p.voided = { at: nowISO(), by: ACTOR, reason };
  audit("void", "Paiement", r.code, `Paiement annulé : ${reason}`);
  return clone(r);
}

// Customers

export const listCustomers = (q?: string) =>
  http.get<Customer[]>(`/api/customers${q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);

export const getCustomer = (id: string) =>
  http.get<{ customer: Customer; repairs: Repair[]; sales: Sale[] }>(`/api/customers/${encodeURIComponent(id)}`);

export const saveCustomer = (input: CustomerInput, id?: string) =>
  id ? http.patch<Customer>(`/api/customers/${encodeURIComponent(id)}`, input) : http.post<Customer>("/api/customers", input);

// Inventory

export const listProducts = () => http.get<Product[]>("/api/products");

export const listProductCategories = () => http.get<string[]>("/api/product-categories");

export const createProductCategory = (name: string) => http.post<string>("/api/product-categories", { name });

export const saveProduct = (input: ProductInput, id?: string) =>
  id ? http.patch<Product>(`/api/products/${encodeURIComponent(id)}`, input) : http.post<Product>("/api/products", input);

export const adjustStock = (input: StockAdjustmentInput) => http.post<Product>("/api/stock/adjustments", input);

export const receiveStock = (input: StockReceiptInput) => http.post<void>("/api/stock/receipts", input);

export const listMovements = (productId?: string) =>
  http.get<StockMovement[]>(`/api/stock/movements${productId ? `?productId=${encodeURIComponent(productId)}` : ""}`);

export const listSuppliers = () => http.get<Supplier[]>("/api/suppliers");

export const saveSupplier = (input: SupplierInput, id?: string) =>
  id ? http.patch<Supplier>(`/api/suppliers/${encodeURIComponent(id)}`, input) : http.post<Supplier>("/api/suppliers", input);

// Sales

export const listSales = () => http.get<Sale[]>("/api/sales");

export const getSale = (id: string) => http.get<Sale>(`/api/sales/${encodeURIComponent(id)}`);

export const createSale = (input: SaleInput) => http.post<Sale>("/api/sales", input);

export const voidSale = (id: string, reason: string) => http.post<Sale>(`/api/sales/${encodeURIComponent(id)}/void`, { reason });

// Expenses

export const listExpenses = () => http.get<Expense[]>("/api/expenses");

export const listExpenseCategories = () => http.get<ExpenseCategory[]>("/api/expense-categories");

export const createExpense = (input: ExpenseInput) => http.post<Expense>("/api/expenses", input);

export const voidExpense = (id: string, reason: string) => http.post<Expense>(`/api/expenses/${encodeURIComponent(id)}/void`, { reason });

export const createExpenseCategory = (name: string) => http.post<ExpenseCategory>("/api/expense-categories", { name });

// Inquiries

export async function listInquiries(): Promise<Inquiry[]> {
  await latency();
  return clone(db.inquiries);
}

export async function setInquiryStatus(id: string, status: InquiryStatus): Promise<Inquiry> {
  await latency();
  const i = db.inquiries.find((x) => x.id === id)!;
  i.status = status;
  return clone(i);
}

export async function convertInquiry(id: string): Promise<Repair> {
  const i = db.inquiries.find((x) => x.id === id)!;
  const [brand = "À préciser", ...model] = (i.device ?? "").split(" ");
  const repair = await createRepair({
    customerName: i.name,
    customerPhone: i.phone,
    brand,
    model: model.join(" ") || "À préciser",
    color: "",
    imei: "",
    fault: i.message,
    conditionNotes: "",
    accessories: "",
    mode: "quote",
    lines: [],
    deposit: 0,
    depositMethod: "cash",
  });
  i.status = "converted";
  i.convertedRepairCode = repair.code;
  return repair;
}

// ───────────────────────────── Staff (live: /api/staff) ─────────────────────────────
// Sign-in, sign-out and "change my password" go through lib/auth-client.ts.

export const listStaff = () => http.get<StaffUser[]>("/api/staff");

/** Active technicians, for the repair "assign" menu (reception + admin). */
export const listTechnicians = () => http.get<StaffUser[]>("/api/staff/technicians");

export const createStaff = (input: StaffUserInput) => http.post<StaffUser>("/api/staff", input);

export const updateStaff = (id: string, patch: StaffUpdateInput) =>
  http.patch<StaffUser>(`/api/staff/${encodeURIComponent(id)}`, patch);

export const resetStaffPassword = (id: string, password: string) =>
  http.post<void>(`/api/staff/${encodeURIComponent(id)}/password`, { password });

// ───────────────────────────── Settings ─────────────────────────────

export const saveSettings = (input: SettingsInput) => http.put<ShopSettings>("/api/settings", input);

export const saveService = (input: ServiceInput, id?: string) =>
  id ? http.patch<Service>(`/api/services/${encodeURIComponent(id)}`, input) : http.post<Service>("/api/services", input);

export const listAudit = () => http.get<AuditEntry[]>("/api/audit");

// Reports

export async function getReport(range: ReportRange): Promise<ReportData> {
  await latency(500);
  const buckets = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 13 : 12;
  const unit = range === "90d" ? "week" : range === "12m" ? "month" : "day";
  const label = (i: number) => {
    const d = new Date();
    if (unit === "day") d.setDate(d.getDate() - (buckets - 1 - i));
    if (unit === "week") d.setDate(d.getDate() - 7 * (buckets - 1 - i));
    if (unit === "month") d.setMonth(d.getMonth() - (buckets - 1 - i));
    return new Intl.DateTimeFormat("fr-FR", unit === "month" ? { month: "short" } : { day: "numeric", month: "short" }).format(d);
  };
  const scale = unit === "day" ? 1 : unit === "week" ? 7 : 30;
  let s = 7;
  const r = () => ((s = (s * 9301 + 49297) % 233280), s / 233280);
  const revenue = Array.from({ length: buckets }, (_, i) => ({
    label: label(i),
    repairs: Math.round((45000 + r() * 70000) * scale / 500) * 500,
    sales: Math.round((15000 + r() * 40000) * scale / 500) * 500,
  }));
  const totalRevenue = revenue.reduce((a, b) => a + b.repairs + b.sales, 0);
  const expensesTotal = Math.round(totalRevenue * 0.28);
  const cogs = Math.round(totalRevenue * 0.34);
  const counts = new Map<RepairStatus, number>();
  for (const rep of db.repairs) counts.set(rep.status, (counts.get(rep.status) ?? 0) + 1);
  return {
    revenue,
    totals: { revenue: totalRevenue, cogs, expenses: expensesTotal, net: totalRevenue - cogs - expensesTotal },
    expensesByCategory: [
      { category: "Salaires", amount: Math.round(expensesTotal * 0.46) },
      { category: "Loyer", amount: Math.round(expensesTotal * 0.29) },
      { category: "Électricité", amount: Math.round(expensesTotal * 0.11) },
      { category: "Internet & téléphone", amount: Math.round(expensesTotal * 0.06) },
      { category: "Transport", amount: Math.round(expensesTotal * 0.05) },
      { category: "Petit matériel", amount: Math.round(expensesTotal * 0.03) },
    ],
    repairsByStatus: [...counts].map(([status, count]) => ({ status, count })),
    technicians: [
      { name: "Ibrahim Diarra", completed: 34 * (scale > 1 ? 3 : 1), avgTurnaroundHours: 19 },
      { name: "Seydou Keïta", completed: 27 * (scale > 1 ? 3 : 1), avgTurnaroundHours: 26 },
    ],
    quoteAcceptanceRate: 0.78,
    avgTurnaroundHours: 22,
    topProducts: [
      { name: "Verre trempé 9H", qty: 86, revenue: 172000 },
      { name: "Coque silicone (assortiment)", qty: 41, revenue: 123000 },
      { name: "Chargeur rapide 20 W USB-C", qty: 17, revenue: 127500 },
      { name: "Tecno Spark 10 128 Go", qty: 4, revenue: 340000 },
      { name: "Câble USB-C 1 m", qty: 29, revenue: 72500 },
    ],
    topServices: [
      { name: "Remplacement d'écran", count: 48, revenue: 1680000 },
      { name: "Remplacement de batterie", count: 31, revenue: 558000 },
      { name: "Connecteur de charge", count: 22, revenue: 198000 },
      { name: "Diagnostic complet", count: 19, revenue: 47500 },
      { name: "Logiciel & mises à jour", count: 14, revenue: 105000 },
    ],
    stockValue: (await listProducts()).reduce((sum, p) => sum + p.qtyOnHand * p.avgCost, 0),
  };
}
