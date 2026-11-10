/**
 * The front end's only data access layer.
 *
 * Every function is async and returns plain domain types (shared/domain/types).
 * Today they read and write the in-memory demo store (client/mock/data).
 * Integration = replace each body with a call to `http` (client/http.ts)
 * against the matching route handler; signatures stay the same, so hooks and
 * screens do not change.
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
  LineItem,
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
  StaffUserInput,
  StockAdjustmentInput,
  StockReceiptInput,
  SupplierInput,
} from "@/shared/schemas/staff";
import { normalizeMaliPhone } from "@/shared/phone";
import type { Role } from "@/shared/auth/permissions";

/** Error shape the real API will return (AppError -> { code, message }). */
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

const latency = (ms = 350) => new Promise((r) => setTimeout(r, ms + Math.random() * 250));
const clone = <T,>(v: T): T => structuredClone(v);
const nowISO = () => new Date().toISOString();
// Demo actor until sessions are wired (server derives it from the session).
const ACTOR = "Aïssata Coulibaly";

function findRepair(id: string) {
  const r = db.repairs.find((x) => x.id === id);
  if (!r) throw new ApiError("NOT_FOUND", "Réparation introuvable.");
  return r;
}

function audit(action: string, entity: string, entityRef: string, summary: string) {
  db.audit.unshift({ id: db.newId("aud"), actor: ACTOR, action, entity, entityRef, summary, at: nowISO() });
}

// ───────────────────────────── Public site ─────────────────────────────

export async function getSettings(): Promise<ShopSettings> {
  await latency(100);
  return clone(db.settings);
}

export async function getServices(opts: { publicOnly?: boolean } = {}): Promise<Service[]> {
  await latency(150);
  return clone(db.services.filter((s) => (opts.publicOnly ? s.isPublic && s.active : true)).sort((a, b) => a.sort - b.sort));
}

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

// ───────────────────────────── Auth (UI only) ─────────────────────────────

export async function login(input: { username: string; password: string }): Promise<StaffUser> {
  await latency(600);
  const user = db.staff.find((u) => u.username === input.username.trim().toLowerCase());
  if (!user || input.password.length < 4) throw new ApiError("INVALID_CREDENTIALS", "Identifiant ou mot de passe incorrect.");
  if (user.banned) throw new ApiError("BANNED_USER", "Ce compte a été désactivé. Contactez l'administrateur.");
  return clone(user);
}

// ───────────────────────────── Dashboard ─────────────────────────────

export async function getDashboardSummary(): Promise<DashboardSummary> {
  await latency();
  const open = db.repairs.filter((r) => OPEN_STATUSES.includes(r.status));
  const today = new Date().toDateString();
  const monthStart = Date.now() - 30 * 86400_000;
  const allPayments = [...db.repairs.flatMap((r) => r.payments), ...db.sales.filter((s) => !s.voided).flatMap((s) => s.payments)].filter(
    (p) => !p.voided,
  );
  return {
    openRepairs: open.length,
    readyForPickup: open.filter((r) => r.status === "ready").length,
    overdue: open.filter((r) => r.estimatedReadyAt && new Date(r.estimatedReadyAt).getTime() < Date.now() && r.status !== "ready").length,
    unclaimed: open.filter((r) => !r.technician).length,
    todayRevenue: allPayments.filter((p) => new Date(p.at).toDateString() === today).reduce((s, p) => s + p.amount, 0),
    monthRevenue: allPayments.filter((p) => new Date(p.at).getTime() > monthStart).reduce((s, p) => s + p.amount, 0),
    lowStock: db.products.filter((p) => p.active && p.qtyOnHand <= p.minQty).length,
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

export async function assignRepair(id: string, technicianId: string | null): Promise<Repair> {
  await latency();
  const r = findRepair(id);
  const t = technicianId ? db.staff.find((u) => u.id === technicianId) : undefined;
  r.technician = t ? { id: t.id, name: t.name } : undefined;
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

export async function listCustomers(q?: string): Promise<Customer[]> {
  await latency();
  const s = q?.trim().toLowerCase();
  return clone(db.customers.filter((c) => (!s ? true : c.name.toLowerCase().includes(s) || c.phone.includes(s.replace(/\s/g, "")))));
}

export async function getCustomer(id: string): Promise<{ customer: Customer; repairs: Repair[]; sales: Sale[] }> {
  await latency();
  const customer = db.customers.find((c) => c.id === id);
  if (!customer) throw new ApiError("NOT_FOUND", "Client introuvable.");
  return clone({
    customer,
    repairs: db.repairs.filter((r) => r.customer.id === id),
    sales: db.sales.filter((s) => s.customer?.id === id),
  });
}

export async function saveCustomer(input: CustomerInput, id?: string): Promise<Customer> {
  await latency();
  const phone = normalizeMaliPhone(input.phone)!;
  const dup = db.customers.find((c) => c.phone === phone && c.id !== id);
  if (dup) throw new ApiError("DUPLICATE_PHONE", `Ce numéro appartient déjà à ${dup.name}.`);
  if (id) {
    const c = db.customers.find((x) => x.id === id)!;
    Object.assign(c, { name: input.name, phone, altPhone: input.altPhone || undefined, notes: input.notes || undefined });
    return clone(c);
  }
  const c: Customer = { id: db.newId("cus"), name: input.name, phone, altPhone: input.altPhone || undefined, notes: input.notes || undefined, createdAt: nowISO(), repairsCount: 0, totalSpent: 0 };
  db.customers.unshift(c);
  return clone(c);
}

// Inventory

export async function listProducts(): Promise<Product[]> {
  await latency();
  return clone(db.products);
}

export async function listProductCategories(): Promise<string[]> {
  return clone(db.productCategories);
}

export async function saveProduct(input: ProductInput, id?: string): Promise<Product> {
  await latency();
  if (db.products.some((p) => p.sku === input.sku && p.id !== id)) throw new ApiError("DUPLICATE_SKU", "Cette référence existe déjà.");
  if (id) {
    const p = db.products.find((x) => x.id === id)!;
    Object.assign(p, input);
    return clone(p);
  }
  const p: Product = { ...input, id: db.newId("prd"), avgCost: 0, qtyOnHand: 0, active: true };
  db.products.unshift(p);
  return clone(p);
}

export async function adjustStock(input: StockAdjustmentInput): Promise<Product> {
  await latency();
  const p = db.products.find((x) => x.id === input.productId)!;
  if (p.qtyOnHand + input.qtyDelta < 0) throw new ApiError("NEGATIVE_STOCK", "Le stock ne peut pas devenir négatif.");
  p.qtyOnHand += input.qtyDelta;
  db.movements.unshift({ id: db.newId("mov"), productId: p.id, productName: p.name, type: "adjustment", qtyDelta: input.qtyDelta, unitCost: p.avgCost, by: ACTOR, at: nowISO(), reason: input.reason });
  audit("adjust", "Stock", p.sku, `Ajustement ${input.qtyDelta > 0 ? "+" : ""}${input.qtyDelta} : ${input.reason}`);
  return clone(p);
}

export async function receiveStock(input: StockReceiptInput): Promise<void> {
  await latency(700);
  const supplier = db.suppliers.find((s) => s.id === input.supplierId)!;
  for (const line of input.lines) {
    const p = db.products.find((x) => x.id === line.productId)!;
    // Weighted average cost (SPEC §2.6).
    p.avgCost = Math.round((p.qtyOnHand * p.avgCost + line.qty * line.unitCost) / (p.qtyOnHand + line.qty));
    p.qtyOnHand += line.qty;
    db.movements.unshift({ id: db.newId("mov"), productId: p.id, productName: p.name, type: "receipt", qtyDelta: line.qty, unitCost: line.unitCost, ref: `Réception ${supplier.name}`, by: ACTOR, at: nowISO() });
  }
  supplier.receiptsCount += 1;
  supplier.lastReceiptAt = nowISO();
}

export async function listMovements(productId?: string): Promise<StockMovement[]> {
  await latency();
  return clone(db.movements.filter((m) => !productId || m.productId === productId));
}

export async function listSuppliers(): Promise<Supplier[]> {
  await latency();
  return clone(db.suppliers);
}

export async function saveSupplier(input: SupplierInput, id?: string): Promise<Supplier> {
  await latency();
  if (id) {
    const s = db.suppliers.find((x) => x.id === id)!;
    Object.assign(s, { ...input, phone: input.phone || undefined });
    return clone(s);
  }
  const s: Supplier = { id: db.newId("sup"), name: input.name, phone: input.phone || undefined, contact: input.contact || undefined, notes: input.notes || undefined, receiptsCount: 0 };
  db.suppliers.unshift(s);
  return clone(s);
}

// Sales

export async function listSales(): Promise<Sale[]> {
  await latency();
  return clone(db.sales);
}

export async function getSale(id: string): Promise<Sale> {
  await latency(200);
  const s = db.sales.find((x) => x.id === id);
  if (!s) throw new ApiError("NOT_FOUND", "Vente introuvable.");
  return clone(s);
}

export async function createSale(input: SaleInput): Promise<Sale> {
  await latency(700);
  const total = linesTotal(input.lines);
  const paid = input.payments.reduce((s, p) => s + p.amount, 0);
  if (paid !== total) throw new ApiError("PAYMENT_MISMATCH", "Les paiements doivent couvrir exactement le total.");
  for (const l of input.lines) {
    const p = db.products.find((x) => x.id === l.refId);
    if (p && p.qtyOnHand < l.qty) throw new ApiError("OUT_OF_STOCK", `Stock insuffisant pour ${p.name}.`);
  }
  const at = nowISO();
  const number = `V-${String(Number(db.sales[0]?.number.slice(2) ?? 1000) + 1).padStart(5, "0")}`;
  for (const l of input.lines) {
    const p = db.products.find((x) => x.id === l.refId);
    if (p) {
      p.qtyOnHand -= l.qty;
      db.movements.unshift({ id: db.newId("mov"), productId: p.id, productName: p.name, type: "sale", qtyDelta: -l.qty, unitCost: p.avgCost, ref: number, by: ACTOR, at });
    }
  }
  const customer = input.customerId ? db.customers.find((c) => c.id === input.customerId) : undefined;
  const sale: Sale = {
    id: db.newId("sal"),
    number,
    customer: customer ? { id: customer.id, name: customer.name, phone: customer.phone } : undefined,
    lines: input.lines.map((l) => ({ ...l, id: db.newId("lin"), discountBy: l.discount ? ACTOR : undefined })) as LineItem[],
    payments: input.payments.map((p) => ({ ...p, id: db.newId("pay"), kind: "payment" as const, receivedBy: ACTOR, at })),
    soldBy: ACTOR,
    at,
  };
  db.sales.unshift(sale);
  return clone(sale);
}

export async function voidSale(id: string, reason: string): Promise<Sale> {
  await latency();
  const s = db.sales.find((x) => x.id === id)!;
  s.voided = { at: nowISO(), by: ACTOR, reason };
  for (const l of s.lines) {
    const p = db.products.find((x) => x.id === l.refId);
    if (p) {
      p.qtyOnHand += l.qty;
      db.movements.unshift({ id: db.newId("mov"), productId: p.id, productName: p.name, type: "void", qtyDelta: l.qty, unitCost: p.avgCost, ref: s.number, by: ACTOR, at: nowISO(), reason });
    }
  }
  audit("void", "Vente", s.number, `Vente annulée : ${reason}`);
  return clone(s);
}

// Expenses

export async function listExpenses(): Promise<Expense[]> {
  await latency();
  return clone([...db.expenses].sort((a, b) => b.date.localeCompare(a.date)));
}

export async function listExpenseCategories(): Promise<ExpenseCategory[]> {
  return clone(db.expenseCategories);
}

export async function createExpense(input: ExpenseInput): Promise<Expense> {
  await latency();
  const e: Expense = {
    id: db.newId("exp"),
    date: new Date(input.date).toISOString(),
    category: db.expenseCategories.find((c) => c.id === input.categoryId)!,
    amount: input.amount,
    method: input.method,
    note: input.note || undefined,
    createdBy: ACTOR,
  };
  db.expenses.unshift(e);
  return clone(e);
}

export async function voidExpense(id: string, reason: string): Promise<Expense> {
  await latency();
  const e = db.expenses.find((x) => x.id === id)!;
  e.voided = { at: nowISO(), by: ACTOR, reason };
  audit("void", "Dépense", e.id, `Dépense annulée : ${reason}`);
  return clone(e);
}

export async function createExpenseCategory(name: string): Promise<ExpenseCategory> {
  await latency();
  const c = { id: db.newId("exc"), name };
  db.expenseCategories.push(c);
  return clone(c);
}

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

// Staff & settings

export async function listStaff(): Promise<StaffUser[]> {
  await latency();
  return clone(db.staff);
}

export async function createStaff(input: StaffUserInput): Promise<StaffUser> {
  await latency();
  if (db.staff.some((u) => u.username === input.username)) throw new ApiError("USERNAME_TAKEN", "Cet identifiant est déjà utilisé.");
  const u: StaffUser = { id: db.newId("usr"), name: input.name, username: input.username, role: input.role, banned: false, createdAt: nowISO() };
  db.staff.push(u);
  audit("create", "Utilisateur", u.username, `Compte ${u.role} créé.`);
  return clone(u);
}

export async function updateStaff(id: string, patch: { role?: Role; banned?: boolean }): Promise<StaffUser> {
  await latency();
  const u = db.staff.find((x) => x.id === id)!;
  Object.assign(u, patch);
  if (patch.banned !== undefined) audit(patch.banned ? "ban" : "unban", "Utilisateur", u.username, patch.banned ? "Compte désactivé." : "Compte réactivé.");
  return clone(u);
}

export async function resetStaffPassword(id: string, password: string): Promise<void> {
  await latency();
  void id;
  void password;
}

export async function saveSettings(input: SettingsInput): Promise<ShopSettings> {
  await latency();
  Object.assign(db.settings, {
    name: input.name,
    address: input.address,
    city: input.city,
    phones: input.phones.map((p) => normalizeMaliPhone(p)!),
    whatsapp: normalizeMaliPhone(input.whatsapp)!,
    email: input.email || undefined,
    terms: input.terms,
    whatsappTemplates: { quoteReady: input.quoteReady, repairReady: input.repairReady },
  });
  return clone(db.settings);
}

export async function saveService(input: ServiceInput, id?: string): Promise<Service> {
  await latency();
  if (id) {
    const s = db.services.find((x) => x.id === id)!;
    Object.assign(s, input);
    return clone(s);
  }
  const s: Service = {
    ...input,
    id: db.newId("svc"),
    slug: input.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-"),
    image: "/assets/services/service-precision-repair.webp",
    sort: db.services.length + 1,
  };
  db.services.push(s);
  return clone(s);
}

export async function listAudit(): Promise<AuditEntry[]> {
  await latency();
  return clone(db.audit);
}

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
    stockValue: db.products.reduce((sum, p) => sum + p.qtyOnHand * p.avgCost, 0),
  };
}
