import type { RepairMode, RepairStatus } from "./types";

/**
 * Allowed status transitions per repair mode (docs/SPEC.md §2.4).
 * The UI uses this to offer actions; the service layer must enforce the
 * same table when the backend is integrated.
 */
const COMMON_EXITS: RepairStatus[] = ["unrepairable", "returned_unrepaired", "cancelled"];

const QUOTE_FLOW: Partial<Record<RepairStatus, RepairStatus[]>> = {
  received: ["diagnosing", ...COMMON_EXITS],
  diagnosing: ["quote_sent", ...COMMON_EXITS],
  quote_sent: ["approved", "refused"],
  approved: ["in_repair", "waiting_parts"],
  refused: ["returned_unrepaired"],
  in_repair: ["waiting_parts", "ready", "unrepairable"],
  waiting_parts: ["in_repair", "cancelled"],
  ready: ["picked_up"],
};

const FIXED_FLOW: Partial<Record<RepairStatus, RepairStatus[]>> = {
  received: ["in_repair", ...COMMON_EXITS],
  in_repair: ["waiting_parts", "ready", "unrepairable"],
  waiting_parts: ["in_repair", "cancelled"],
  ready: ["picked_up"],
};

export function nextStatuses(mode: RepairMode, status: RepairStatus): RepairStatus[] {
  return (mode === "quote" ? QUOTE_FLOW : FIXED_FLOW)[status] ?? [];
}

/** Ordered happy path, used for the public tracking progress bar. */
export function happyPath(mode: RepairMode): RepairStatus[] {
  return mode === "quote"
    ? ["received", "diagnosing", "quote_sent", "approved", "in_repair", "ready", "picked_up"]
    : ["received", "in_repair", "ready", "picked_up"];
}
