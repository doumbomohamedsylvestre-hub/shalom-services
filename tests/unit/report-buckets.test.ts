import { describe, expect, it } from "vitest";
import { buckets } from "@/server/services/report-buckets";

const now = new Date("2026-11-11T15:30:00Z");

describe("report periods", () => {
  it.each([
    ["7d", 7],
    ["30d", 30],
    ["90d", 13],
    ["12m", 12],
  ] as const)("%s has %i contiguous buckets ending today", (range, n) => {
    const bs = buckets(range, now);
    expect(bs).toHaveLength(n);
    for (let i = 1; i < bs.length; i++) expect(bs[i]!.start.getTime()).toBe(bs[i - 1]!.end.getTime());
    expect(bs.at(-1)!.start.getTime()).toBeLessThanOrEqual(now.getTime());
    expect(bs.at(-1)!.end.getTime()).toBeGreaterThan(now.getTime());
  });

  it("months start on the 1st, days at midnight UTC", () => {
    expect(buckets("12m", now)[0]!.start.toISOString()).toBe("2025-12-01T00:00:00.000Z");
    expect(buckets("7d", now)[0]!.start.toISOString()).toBe("2026-11-05T00:00:00.000Z");
  });
});
