"use client";

import { useQuery } from "@tanstack/react-query";
import * as api from "@/client/api";
import type { RepairFilters } from "@/client/api";
import { qk } from "@/client/query-keys";
import type { InquiryStatus, ReportRange, RepairStatus } from "@/shared/domain/types";
import type { Role } from "@/shared/auth/permissions";
import { useAppMutation } from "./mutation";

// ── Shared / public
export const useSettings = () => useQuery({ queryKey: qk.settings, queryFn: api.getSettings });
export const useServices = (publicOnly = false) =>
  useQuery({ queryKey: qk.services.list(publicOnly), queryFn: () => api.getServices({ publicOnly }) });

export const useSubmitInquiry = () =>
  useAppMutation({ fn: api.submitInquiry, invalidate: [qk.inquiries, qk.summary] });

// ── Dashboard summary
export const useDashboardSummary = () => useQuery({ queryKey: qk.summary, queryFn: api.getDashboardSummary });

// ── Repairs
const repairKeys = [qk.repairs.all, qk.summary, qk.customers.all];
export const useRepairs = (f: RepairFilters) => useQuery({ queryKey: qk.repairs.list(f), queryFn: () => api.listRepairs(f) });
export const useRepair = (id: string) => useQuery({ queryKey: qk.repairs.detail(id), queryFn: () => api.getRepair(id) });

export const useCreateRepair = () =>
  useAppMutation({ fn: api.createRepair, invalidate: repairKeys, success: (r) => `Ticket ${r.code} créé.` });
export const useClaimRepair = () =>
  useAppMutation({
    fn: (v: { id: string; technician: { id: string; name: string } }) => api.claimRepair(v.id, v.technician),
    invalidate: repairKeys,
    success: (r) => `${r.code} vous est attribué.`,
  });
export const useAssignRepair = () =>
  useAppMutation({
    fn: (v: { id: string; technicianId: string | null }) => api.assignRepair(v.id, v.technicianId),
    invalidate: repairKeys,
    success: "Technicien mis à jour.",
  });
export const useChangeRepairStatus = () =>
  useAppMutation({
    fn: (v: { id: string; to: RepairStatus; note?: string }) => api.changeRepairStatus(v.id, v.to, v.note),
    invalidate: [...repairKeys, qk.reports.all],
    success: "Statut mis à jour.",
  });
export const useUpdateDiagnosis = () =>
  useAppMutation({
    fn: (v: { id: string; diagnosis: string }) => api.updateRepairDiagnosis(v.id, v.diagnosis),
    invalidate: [qk.repairs.all],
    success: "Diagnostic enregistré.",
  });
export const useAddRepairLine = () =>
  useAppMutation({
    fn: (v: { id: string; line: Parameters<typeof api.addRepairLine>[1] }) => api.addRepairLine(v.id, v.line),
    invalidate: [qk.repairs.all, qk.products.all, qk.movements.all],
    success: "Ligne ajoutée.",
  });
export const useRemoveRepairLine = () =>
  useAppMutation({
    fn: (v: { id: string; lineId: string }) => api.removeRepairLine(v.id, v.lineId),
    invalidate: [qk.repairs.all, qk.products.all, qk.movements.all],
    success: "Ligne retirée.",
  });
export const useRecordRepairPayment = () =>
  useAppMutation({
    fn: (v: { id: string; payment: Parameters<typeof api.recordRepairPayment>[1] }) => api.recordRepairPayment(v.id, v.payment),
    invalidate: [...repairKeys, qk.reports.all, qk.audit],
    success: "Paiement enregistré.",
  });
export const useVoidPayment = () =>
  useAppMutation({
    fn: (v: { repairId: string; paymentId: string; reason: string }) => api.voidPayment(v.repairId, v.paymentId, v.reason),
    invalidate: [...repairKeys, qk.reports.all, qk.audit],
    success: "Paiement annulé.",
  });

// ── Customers
export const useCustomers = (q = "") => useQuery({ queryKey: qk.customers.list(q), queryFn: () => api.listCustomers(q) });
export const useCustomer = (id: string) => useQuery({ queryKey: qk.customers.detail(id), queryFn: () => api.getCustomer(id) });
export const useSaveCustomer = () =>
  useAppMutation({
    fn: (v: { input: Parameters<typeof api.saveCustomer>[0]; id?: string }) => api.saveCustomer(v.input, v.id),
    invalidate: [qk.customers.all, qk.repairs.all],
    success: (_c, v) => (v.id ? "Client mis à jour." : "Client ajouté."),
  });

// ── Inventory
export const useProducts = () => useQuery({ queryKey: qk.products.all, queryFn: api.listProducts });
export const useProductCategories = () => useQuery({ queryKey: qk.products.categories, queryFn: api.listProductCategories });
export const useSaveProduct = () =>
  useAppMutation({
    fn: (v: { input: Parameters<typeof api.saveProduct>[0]; id?: string }) => api.saveProduct(v.input, v.id),
    invalidate: [qk.products.all],
    success: (_p, v) => (v.id ? "Produit mis à jour." : "Produit ajouté."),
  });
export const useAdjustStock = () =>
  useAppMutation({ fn: api.adjustStock, invalidate: [qk.products.all, qk.movements.all, qk.summary, qk.audit], success: "Stock ajusté." });
export const useReceiveStock = () =>
  useAppMutation({
    fn: api.receiveStock,
    invalidate: [qk.products.all, qk.movements.all, qk.suppliers, qk.summary],
    success: "Réception enregistrée, stock et coûts mis à jour.",
  });
export const useMovements = (productId?: string) =>
  useQuery({ queryKey: qk.movements.list(productId), queryFn: () => api.listMovements(productId) });
export const useSuppliers = () => useQuery({ queryKey: qk.suppliers, queryFn: api.listSuppliers });
export const useSaveSupplier = () =>
  useAppMutation({
    fn: (v: { input: Parameters<typeof api.saveSupplier>[0]; id?: string }) => api.saveSupplier(v.input, v.id),
    invalidate: [qk.suppliers],
    success: (_s, v) => (v.id ? "Fournisseur mis à jour." : "Fournisseur ajouté."),
  });

// ── Sales
export const useSales = () => useQuery({ queryKey: qk.sales.all, queryFn: api.listSales });
export const useSale = (id: string) => useQuery({ queryKey: qk.sales.detail(id), queryFn: () => api.getSale(id) });
export const useCreateSale = () =>
  useAppMutation({
    fn: api.createSale,
    invalidate: [qk.sales.all, qk.products.all, qk.movements.all, qk.summary, qk.reports.all],
    success: (s) => `Vente ${s.number} enregistrée.`,
  });
export const useVoidSale = () =>
  useAppMutation({
    fn: (v: { id: string; reason: string }) => api.voidSale(v.id, v.reason),
    invalidate: [qk.sales.all, qk.products.all, qk.movements.all, qk.summary, qk.reports.all, qk.audit],
    success: "Vente annulée, stock remis à jour.",
  });

// ── Expenses
export const useExpenses = () => useQuery({ queryKey: qk.expenses.all, queryFn: api.listExpenses });
export const useExpenseCategories = () => useQuery({ queryKey: qk.expenses.categories, queryFn: api.listExpenseCategories });
export const useCreateExpense = () =>
  useAppMutation({ fn: api.createExpense, invalidate: [qk.expenses.all, qk.reports.all], success: "Dépense enregistrée." });
export const useVoidExpense = () =>
  useAppMutation({
    fn: (v: { id: string; reason: string }) => api.voidExpense(v.id, v.reason),
    invalidate: [qk.expenses.all, qk.reports.all, qk.audit],
    success: "Dépense annulée.",
  });
export const useCreateExpenseCategory = () =>
  useAppMutation({ fn: api.createExpenseCategory, invalidate: [qk.expenses.categories], success: "Catégorie ajoutée." });

// ── Inquiries
export const useInquiries = () => useQuery({ queryKey: qk.inquiries, queryFn: api.listInquiries });
export const useSetInquiryStatus = () =>
  useAppMutation({
    fn: (v: { id: string; status: InquiryStatus }) => api.setInquiryStatus(v.id, v.status),
    invalidate: [qk.inquiries, qk.summary],
    success: "Demande mise à jour.",
  });
export const useConvertInquiry = () =>
  useAppMutation({
    fn: api.convertInquiry,
    invalidate: [qk.inquiries, ...repairKeys],
    success: (r) => `Ticket ${r.code} créé à partir de la demande.`,
  });

// ── Staff, settings, services, audit, reports
export const useStaff = () => useQuery({ queryKey: qk.staff, queryFn: api.listStaff });
export const useCreateStaff = () =>
  useAppMutation({ fn: api.createStaff, invalidate: [qk.staff, qk.audit], success: (u) => `Compte « ${u.username} » créé.` });
export const useUpdateStaff = () =>
  useAppMutation({
    fn: (v: { id: string; role?: Role; banned?: boolean }) => api.updateStaff(v.id, { role: v.role, banned: v.banned }),
    invalidate: [qk.staff, qk.audit],
    success: (u, v) => (v.banned === true ? `${u.name} est désactivé.` : v.banned === false ? `${u.name} est réactivé.` : "Rôle mis à jour."),
  });
export const useResetStaffPassword = () =>
  useAppMutation({
    fn: (v: { id: string; password: string }) => api.resetStaffPassword(v.id, v.password),
    success: "Mot de passe réinitialisé.",
  });
export const useSaveSettings = () =>
  useAppMutation({ fn: api.saveSettings, invalidate: [qk.settings], success: "Paramètres enregistrés." });
export const useSaveService = () =>
  useAppMutation({
    fn: (v: { input: Parameters<typeof api.saveService>[0]; id?: string }) => api.saveService(v.input, v.id),
    invalidate: [qk.services.all],
    success: (_s, v) => (v.id ? "Prestation mise à jour." : "Prestation ajoutée."),
  });
export const useAudit = () => useQuery({ queryKey: qk.audit, queryFn: api.listAudit });
export const useReport = (range: ReportRange) => useQuery({ queryKey: qk.reports.range(range), queryFn: () => api.getReport(range) });

export const useTrackRepair = () =>
  useAppMutation({ fn: api.trackRepair });
