import type { LineItem, Payment, XOF } from "./types";

export function lineTotal(line: Pick<LineItem, "qty" | "unitPrice" | "discount">): XOF {
  return Math.max(0, line.qty * line.unitPrice - line.discount);
}

export function linesTotal(lines: Pick<LineItem, "qty" | "unitPrice" | "discount">[]): XOF {
  return lines.reduce((sum, l) => sum + lineTotal(l), 0);
}

export function paidTotal(payments: Payment[]): XOF {
  return payments.filter((p) => !p.voided).reduce((sum, p) => sum + p.amount, 0);
}

export function balanceDue(lines: LineItem[], payments: Payment[]): XOF {
  return Math.max(0, linesTotal(lines) - paidTotal(payments));
}
