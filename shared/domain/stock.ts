/**
 * Weighted average cost after receiving `qty` units at `unitCost` (SPEC §2.6):
 * (stock × current average + received × unit cost) / new stock, rounded to
 * whole XOF. With no stock on hand the new average is simply the unit cost.
 */
export function weightedAverageCost(qtyOnHand: number, avgCost: number, qty: number, unitCost: number) {
  const total = Math.max(0, qtyOnHand) + qty;
  if (total <= 0) return unitCost;
  return Math.round((Math.max(0, qtyOnHand) * avgCost + qty * unitCost) / total);
}
