/** Report periods (pure, no database): consecutive UTC buckets ending today. */
import type { ReportRange } from "@/shared/domain/types";

const DAY = 86400_000;

type Bucket = { start: Date; end: Date; label: string };

export function startOfUtcDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Consecutive buckets covering the range and ending today (inclusive). */
export function buckets(range: ReportRange, now = new Date()): Bucket[] {
  const today = startOfUtcDay(now);
  const dayFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
  const monthFmt = new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: "UTC" });
  if (range === "12m") {
    return Array.from({ length: 12 }, (_, i) => {
      const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - (11 - i), 1));
      const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
      return { start, end, label: monthFmt.format(start) };
    });
  }
  if (range === "90d") {
    const first = new Date(today.getTime() - (13 * 7 - 1) * DAY);
    return Array.from({ length: 13 }, (_, i) => {
      const start = new Date(first.getTime() + i * 7 * DAY);
      return { start, end: new Date(start.getTime() + 7 * DAY), label: dayFmt.format(start) };
    });
  }
  const days = range === "7d" ? 7 : 30;
  return Array.from({ length: days }, (_, i) => {
    const start = new Date(today.getTime() - (days - 1 - i) * DAY);
    return { start, end: new Date(start.getTime() + DAY), label: dayFmt.format(start) };
  });
}

