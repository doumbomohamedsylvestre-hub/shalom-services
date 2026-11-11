import { describe, expect, it } from "vitest";
import { happyPath, nextStatuses } from "@/shared/domain/repair-flow";
import { REPAIR_STATUSES, type RepairMode, type RepairStatus } from "@/shared/domain/types";

describe("repair status machine (SPEC §2.4)", () => {
  it("fixed-price tickets skip diagnosis and quote", () => {
    expect(nextStatuses("fixed", "received")).toContain("in_repair");
    expect(nextStatuses("fixed", "received")).not.toContain("diagnosing");
    for (const s of ["diagnosing", "quote_sent", "approved", "refused"] as RepairStatus[]) {
      expect(nextStatuses("fixed", s)).toEqual([]);
    }
  });

  it("quote tickets go through diagnosis, quote and decision", () => {
    expect(nextStatuses("quote", "received")).toContain("diagnosing");
    expect(nextStatuses("quote", "received")).not.toContain("in_repair");
    expect(nextStatuses("quote", "diagnosing")).toContain("quote_sent");
    expect(nextStatuses("quote", "quote_sent").sort()).toEqual(["approved", "refused"]);
    expect(nextStatuses("quote", "refused")).toEqual(["returned_unrepaired"]);
  });

  it("in repair and waiting for parts alternate", () => {
    for (const mode of ["fixed", "quote"] as RepairMode[]) {
      expect(nextStatuses(mode, "in_repair")).toContain("waiting_parts");
      expect(nextStatuses(mode, "waiting_parts")).toContain("in_repair");
    }
  });

  it("ready only leads to picked up; closed statuses are terminal", () => {
    expect(nextStatuses("quote", "ready")).toEqual(["picked_up"]);
    for (const s of ["picked_up", "cancelled", "returned_unrepaired", "unrepairable"] as RepairStatus[]) {
      expect(nextStatuses("fixed", s)).toEqual([]);
      expect(nextStatuses("quote", s)).toEqual([]);
    }
  });

  it("only ever targets known statuses", () => {
    for (const mode of ["fixed", "quote"] as RepairMode[]) {
      for (const s of REPAIR_STATUSES) for (const n of nextStatuses(mode, s)) expect(REPAIR_STATUSES).toContain(n);
    }
  });

  it("every happy-path step is an allowed transition", () => {
    for (const mode of ["fixed", "quote"] as RepairMode[]) {
      const path = happyPath(mode);
      for (let i = 1; i < path.length; i++) {
        const from = path[i - 1]!;
        const to = path[i]!;
        // quote: approved → in_repair; fixed: received → in_repair
        expect(nextStatuses(mode, from)).toContain(to);
      }
    }
  });
});
