/**
 * The front end's only data access layer.
 *
 * Every function calls a route handler under /api through client/http.ts and
 * returns plain domain types (shared/domain/types). Business rules and
 * permissions live on the server (server/services/*); screens and hooks only
 * depend on these signatures.
 */
import { ApiError, http } from "@/client/http";
import type {
  AuditEntry,
  Customer,
  DashboardSummary,
  Expense,
  ExpenseCategory,
  Inquiry,
  InquiryStatus,
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
  StockReceipt,
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

export { ApiError };

const enc = encodeURIComponent;
const qs = (params: Record<string, string | undefined>) => {
  const s = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => !!e[1])).toString();
  return s ? `?${s}` : "";
};

// ───────────────────────────── Public site ─────────────────────────────

export const getSettings = () => http.get<ShopSettings>("/api/settings");

export const getServices = (opts: { publicOnly?: boolean } = {}) => http.get<Service[]>(`/api/services${opts.publicOnly ? "?public=1" : ""}`);

export const submitInquiry = (input: InquiryInput) => http.post<{ id: string }>("/api/public/inquiries", input);

export const trackRepair = (input: TrackingInput) => http.post<TrackingResult>("/api/public/track", input);

// ───────────────────────────── Dashboard ─────────────────────────────

export const getDashboardSummary = () => http.get<DashboardSummary>("/api/dashboard");

// ───────────────────────────── Repairs ─────────────────────────────

export type RepairFilters = {
  q?: string;
  status?: RepairStatus | "open" | "all";
  technicianId?: string | "unclaimed";
};

export const listRepairs = (f: RepairFilters = {}) =>
  http.get<Repair[]>(`/api/repairs${qs({ q: f.q?.trim() || undefined, status: f.status, technicianId: f.technicianId })}`);

export const getRepair = (id: string) => http.get<Repair>(`/api/repairs/${enc(id)}`);

export const createRepair = (input: RepairIntakeInput) => http.post<Repair>("/api/repairs", input);

/** The server always claims for the signed-in technician; `technician` is kept for the hook signature. */
export const claimRepair = (id: string, technician: { id: string; name: string }) => {
  void technician;
  return http.post<Repair>(`/api/repairs/${enc(id)}/claim`);
};

export const assignRepair = (id: string, technician: { id: string; name: string } | null) =>
  http.post<Repair>(`/api/repairs/${enc(id)}/assign`, { technicianId: technician?.id ?? null });

export const changeRepairStatus = (id: string, to: RepairStatus, note?: string) => http.post<Repair>(`/api/repairs/${enc(id)}/status`, { to, note });

export const updateRepairDiagnosis = (id: string, diagnosis: string) => http.put<Repair>(`/api/repairs/${enc(id)}/diagnosis`, { diagnosis });

export const addRepairLine = (id: string, line: LineInput) => http.post<Repair>(`/api/repairs/${enc(id)}/lines`, line);

export const removeRepairLine = (id: string, lineId: string) => http.delete<Repair>(`/api/repairs/${enc(id)}/lines/${enc(lineId)}`);

export const recordRepairPayment = (id: string, input: PaymentInput) => http.post<Repair>(`/api/repairs/${enc(id)}/payments`, input);

export const voidPayment = (repairId: string, paymentId: string, reason: string) =>
  http.post<Repair>(`/api/repairs/${enc(repairId)}/payments/${enc(paymentId)}/void`, { reason });

// ───────────────────────────── Customers ─────────────────────────────

export const listCustomers = (q?: string) => http.get<Customer[]>(`/api/customers${qs({ q: q?.trim() || undefined })}`);

export const getCustomer = (id: string) => http.get<{ customer: Customer; repairs: Repair[]; sales: Sale[] }>(`/api/customers/${enc(id)}`);

export const saveCustomer = (input: CustomerInput, id?: string) =>
  id ? http.patch<Customer>(`/api/customers/${enc(id)}`, input) : http.post<Customer>("/api/customers", input);

// ───────────────────────────── Inventory ─────────────────────────────

export const listProducts = () => http.get<Product[]>("/api/products");

export const listProductCategories = () => http.get<string[]>("/api/product-categories");

export const createProductCategory = (name: string) => http.post<string>("/api/product-categories", { name });

export const saveProduct = (input: ProductInput, id?: string) =>
  id ? http.patch<Product>(`/api/products/${enc(id)}`, input) : http.post<Product>("/api/products", input);

export const adjustStock = (input: StockAdjustmentInput) => http.post<Product>("/api/stock/adjustments", input);

export const receiveStock = (input: StockReceiptInput) => http.post<void>("/api/stock/receipts", input);

export const listReceipts = () => http.get<StockReceipt[]>("/api/stock/receipts");

export const voidReceipt = (id: string, reason: string) => http.post<StockReceipt>(`/api/stock/receipts/${enc(id)}/void`, { reason });

export const listMovements = (productId?: string) => http.get<StockMovement[]>(`/api/stock/movements${qs({ productId })}`);

export const listSuppliers = () => http.get<Supplier[]>("/api/suppliers");

export const saveSupplier = (input: SupplierInput, id?: string) =>
  id ? http.patch<Supplier>(`/api/suppliers/${enc(id)}`, input) : http.post<Supplier>("/api/suppliers", input);

// ───────────────────────────── Sales ─────────────────────────────

export const listSales = () => http.get<Sale[]>("/api/sales");

export const getSale = (id: string) => http.get<Sale>(`/api/sales/${enc(id)}`);

export const createSale = (input: SaleInput) => http.post<Sale>("/api/sales", input);

export const voidSale = (id: string, reason: string) => http.post<Sale>(`/api/sales/${enc(id)}/void`, { reason });

// ───────────────────────────── Expenses ─────────────────────────────

export const listExpenses = () => http.get<Expense[]>("/api/expenses");

export const listExpenseCategories = () => http.get<ExpenseCategory[]>("/api/expense-categories");

export const createExpense = (input: ExpenseInput) => http.post<Expense>("/api/expenses", input);

export const voidExpense = (id: string, reason: string) => http.post<Expense>(`/api/expenses/${enc(id)}/void`, { reason });

export const createExpenseCategory = (name: string) => http.post<ExpenseCategory>("/api/expense-categories", { name });

// ───────────────────────────── Inquiries ─────────────────────────────

export const listInquiries = () => http.get<Inquiry[]>("/api/inquiries");

export const setInquiryStatus = (id: string, status: InquiryStatus) => http.patch<Inquiry>(`/api/inquiries/${enc(id)}`, { status });

export const convertInquiry = (id: string) => http.post<Repair>(`/api/inquiries/${enc(id)}/convert`);

// ───────────────────────────── Staff (sign-in/out via lib/auth-client.ts) ─────────────────────────────

export const listStaff = () => http.get<StaffUser[]>("/api/staff");

/** Active technicians, for the repair "assign" menu (reception + admin). */
export const listTechnicians = () => http.get<StaffUser[]>("/api/staff/technicians");

export const createStaff = (input: StaffUserInput) => http.post<StaffUser>("/api/staff", input);

export const updateStaff = (id: string, patch: StaffUpdateInput) => http.patch<StaffUser>(`/api/staff/${enc(id)}`, patch);

export const resetStaffPassword = (id: string, password: string) => http.post<void>(`/api/staff/${enc(id)}/password`, { password });

// ───────────────────────────── Settings, audit, reports ─────────────────────────────

export const saveSettings = (input: SettingsInput) => http.put<ShopSettings>("/api/settings", input);

export const saveService = (input: ServiceInput, id?: string) =>
  id ? http.patch<Service>(`/api/services/${enc(id)}`, input) : http.post<Service>("/api/services", input);

/** Compresses the photo, uploads it straight to object storage, returns its public URL. */
export async function uploadServiceImage(file: File): Promise<string> {
  const { compressImage } = await import("@/client/compress-image");
  const blob = await compressImage(file);
  const { uploadUrl, publicUrl, headers } = await http.post<{ uploadUrl: string; publicUrl: string; headers: Record<string, string> }>(
    "/api/uploads/service-image",
    { contentType: blob.type, size: blob.size },
  );
  const res = await fetch(uploadUrl, { method: "PUT", body: blob, headers }).catch(() => null);
  if (!res?.ok) throw new ApiError("UPLOAD_FAILED", "L'envoi de l'image a échoué. Vérifiez la connexion et réessayez.");
  return publicUrl;
}

export const listAudit = () => http.get<AuditEntry[]>("/api/audit");

export const getReport = (range: ReportRange) => http.get<ReportData>(`/api/reports?range=${enc(range)}`);
