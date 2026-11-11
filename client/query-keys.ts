import type { RepairFilters } from "@/client/api";
import type { ReportRange } from "@/shared/domain/types";

/**
 * Query keys by entity. Mutations invalidate whole entity roots
 * (e.g. qk.repairs.all) so every list/detail of that entity refreshes.
 */
export const qk = {
  settings: ["settings"] as const,
  services: { all: ["services"] as const, list: (publicOnly: boolean) => ["services", { publicOnly }] as const },
  summary: ["summary"] as const,
  repairs: {
    all: ["repairs"] as const,
    list: (f: RepairFilters) => ["repairs", "list", f] as const,
    detail: (id: string) => ["repairs", "detail", id] as const,
  },
  customers: {
    all: ["customers"] as const,
    list: (q: string) => ["customers", "list", q] as const,
    detail: (id: string) => ["customers", "detail", id] as const,
  },
  products: { all: ["products"] as const, categories: ["products", "categories"] as const },
  movements: { all: ["movements"] as const, list: (productId?: string) => ["movements", productId ?? "all"] as const },
  suppliers: ["suppliers"] as const,
  receipts: ["receipts"] as const,
  sales: { all: ["sales"] as const, detail: (id: string) => ["sales", "detail", id] as const },
  expenses: { all: ["expenses"] as const, categories: ["expenses", "categories"] as const },
  inquiries: ["inquiries"] as const,
  staff: ["staff"] as const,
  technicians: ["staff", "technicians"] as const,
  audit: ["audit"] as const,
  reports: { all: ["reports"] as const, range: (r: ReportRange) => ["reports", r] as const },
};
