import { describe, expect, it } from "vitest";
import { weightedAverageCost } from "@/shared/domain/stock";

describe("weighted average cost (SPEC §2.6)", () => {
  it("blends current stock and the receipt", () => {
    expect(weightedAverageCost(6, 22000, 4, 25000)).toBe(23200);
  });
  it("uses the unit cost when the shelf is empty", () => {
    expect(weightedAverageCost(0, 22000, 3, 18000)).toBe(18000);
  });
  it("rounds to whole XOF", () => {
    expect(weightedAverageCost(1, 1000, 2, 1001)).toBe(1001);
    expect(weightedAverageCost(2, 1000, 1, 1001)).toBe(1000);
  });
  it("does not let a negative quantity skew the result", () => {
    expect(weightedAverageCost(-3, 5000, 2, 4000)).toBe(4000);
  });
});
