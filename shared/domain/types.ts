/**
 * Domain types shared by the UI, the API layer and (later) the service layer.
 * They mirror the data model in docs/SPEC.md §3. Money is always an integer
 * amount of XOF. Dates are ISO strings on the wire.
 */
import type { Role } from "@/shared/auth/permissions";

export type ID = string;
export type ISODate = string;
export type XOF = number;

export type ShopSettings = {
  name: string;
  address: string;
  city: string;
  phones: string[];
  whatsapp: string;
  email?: string;
  mapEmbedUrl?: string;
  mapUrl?: string;
  hours: { days: string; open: string; close: string }[];
  terms: string;
  taxRate: number;
  prefixes: { sale: string; invoice: string };
  whatsappTemplates: { quoteReady: string; repairReady: string };
};

export type Service = {
  id: ID;
  slug: string;
  name: string;
  summary: string;
  description: string;
  priceFrom: XOF | null;
  durationLabel: string;
  image: string;
  isPublic: boolean;
  active: boolean;
  sort: number;
};

export type StaffUser = {
  id: ID;
  name: string;
  username: string;
  role: Role;
  banned: boolean;
  createdAt: ISODate;
  lastSeenAt?: ISODate;
};

export type Customer = {
  id: ID;
  name: string;
  phone: string;
  altPhone?: string;
  notes?: string;
  createdAt: ISODate;
  repairsCount: number;
  totalSpent: XOF;
};

export const REPAIR_STATUSES = [
  "received",
  "diagnosing",
  "quote_sent",
  "approved",
  "refused",
  "in_repair",
  "waiting_parts",
  "ready",
  "picked_up",
  "unrepairable",
  "returned_unrepaired",
  "cancelled",
] as const;
export type RepairStatus = (typeof REPAIR_STATUSES)[number];
export type RepairMode = "fixed" | "quote";

export type LineItem = {
  id: ID;
  kind: "service" | "product";
  refId?: ID;
  label: string;
  qty: number;
  unitPrice: XOF;
  discount: XOF;
  discountBy?: string;
};

export type RepairStatusEvent = {
  id: ID;
  from: RepairStatus | null;
  to: RepairStatus;
  by: string;
  at: ISODate;
  note?: string;
};

export type Device = {
  brand: string;
  model: string;
  color?: string;
  imei?: string;
};

export type Repair = {
  id: ID;
  code: string;
  customer: Pick<Customer, "id" | "name" | "phone">;
  device: Device;
  fault: string;
  conditionNotes?: string;
  accessories?: string;
  diagnosis?: string;
  mode: RepairMode;
  status: RepairStatus;
  technician?: Pick<StaffUser, "id" | "name">;
  lines: LineItem[];
  payments: Payment[];
  events: RepairStatusEvent[];
  estimatedReadyAt?: ISODate;
  /** Sequential invoice number, assigned when the device is picked up. */
  invoiceNumber?: string;
  createdAt: ISODate;
  updatedAt: ISODate;
};

export type PaymentMethod = "cash" | "orange_money" | "moov_money" | "bank";

export type Payment = {
  id: ID;
  amount: XOF;
  method: PaymentMethod;
  kind: "deposit" | "payment";
  receivedBy: string;
  at: ISODate;
  voided?: { at: ISODate; by: string; reason: string };
};

export type ProductKind = "part" | "accessory" | "phone";

export type Product = {
  id: ID;
  sku: string;
  name: string;
  kind: ProductKind;
  category: string;
  salePrice: XOF;
  avgCost: XOF;
  qtyOnHand: number;
  minQty: number;
  active: boolean;
};

export type Supplier = {
  id: ID;
  name: string;
  phone?: string;
  contact?: string;
  notes?: string;
  receiptsCount: number;
  lastReceiptAt?: ISODate;
};

export type StockMovementType = "receipt" | "sale" | "repair_use" | "adjustment" | "void";

export type StockMovement = {
  id: ID;
  productId: ID;
  productName: string;
  type: StockMovementType;
  qtyDelta: number;
  unitCost: XOF;
  ref?: string;
  by: string;
  at: ISODate;
  reason?: string;
};

export type StockReceipt = {
  id: ID;
  supplier: Pick<Supplier, "id" | "name">;
  lines: { productId: ID; productName: string; qty: number; unitCost: XOF }[];
  totalCost: XOF;
  amountPaid: XOF;
  note?: string;
  by: string;
  at: ISODate;
  voided?: { at: ISODate; by: string; reason: string };
};

export type Sale = {
  id: ID;
  number: string;
  customer?: Pick<Customer, "id" | "name" | "phone">;
  lines: LineItem[];
  payments: Payment[];
  soldBy: string;
  at: ISODate;
  voided?: { at: ISODate; by: string; reason: string };
};

export type ExpenseCategory = { id: ID; name: string };

export type Expense = {
  id: ID;
  date: ISODate;
  category: ExpenseCategory;
  amount: XOF;
  method: PaymentMethod;
  note?: string;
  createdBy: string;
  voided?: { at: ISODate; by: string; reason: string };
};

export type InquiryType = "repair" | "quote" | "contact";
export type InquiryStatus = "new" | "contacted" | "converted" | "closed";

export type Inquiry = {
  id: ID;
  type: InquiryType;
  name: string;
  phone: string;
  device?: string;
  message: string;
  status: InquiryStatus;
  convertedRepairCode?: string;
  createdAt: ISODate;
};

export type AuditEntry = {
  id: ID;
  actor: string;
  action: string;
  entity: string;
  entityRef: string;
  summary: string;
  at: ISODate;
};

/** Public tracking result: status timeline only, no prices, masked name. */
export type TrackingResult = {
  code: string;
  maskedName: string;
  device: string;
  status: RepairStatus;
  estimatedReadyAt?: ISODate;
  timeline: { status: RepairStatus; at: ISODate }[];
};

export type DashboardSummary = {
  openRepairs: number;
  readyForPickup: number;
  overdue: number;
  unclaimed: number;
  todayRevenue: XOF;
  monthRevenue: XOF;
  lowStock: number;
  newInquiries: number;
};

export type ReportRange = "7d" | "30d" | "90d" | "12m";

export type ReportData = {
  revenue: { label: string; repairs: XOF; sales: XOF }[];
  totals: { revenue: XOF; cogs: XOF; expenses: XOF; net: XOF };
  expensesByCategory: { category: string; amount: XOF }[];
  repairsByStatus: { status: RepairStatus; count: number }[];
  technicians: { name: string; completed: number; avgTurnaroundHours: number }[];
  quoteAcceptanceRate: number;
  avgTurnaroundHours: number;
  topProducts: { name: string; qty: number; revenue: XOF }[];
  topServices: { name: string; count: number; revenue: XOF }[];
  stockValue: XOF;
};

export type Paginated<T> = { items: T[]; total: number; page: number; pageSize: number };
