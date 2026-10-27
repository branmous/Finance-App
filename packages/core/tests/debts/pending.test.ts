import { describe, expect, it } from "vitest";

import { pendingInstallmentsForPeriod, type PendingDebtSource } from "../../src/debts/pending";

const monthly: PendingDebtSource = {
  id: "d1",
  name: "Moto",
  categoryId: "c1",
  kind: "monthly",
  installmentMinor: 300,
  totalMinor: null,
  startPeriod: "2026-09",
  totalInstallments: 3,
};

const deferred: PendingDebtSource = {
  id: "d2",
  name: "TV",
  categoryId: "c2",
  kind: "deferred",
  installmentMinor: 333,
  totalMinor: 1000,
  startPeriod: "2026-10",
  totalInstallments: 3,
};

describe("pendingInstallmentsForPeriod", () => {
  it("returns the installment of a month inside the schedule", () => {
    expect(pendingInstallmentsForPeriod([monthly], "2026-11", [])).toEqual([
      { debtId: "d1", debtName: "Moto", categoryId: "c1", period: "2026-11", amountMinor: 300 },
    ]);
  });

  it("ignores months outside the schedule", () => {
    expect(pendingInstallmentsForPeriod([monthly], "2026-08", [])).toEqual([]);
    expect(pendingInstallmentsForPeriod([monthly], "2026-12", [])).toEqual([]);
  });

  it("skips a debt that already has an expense that month", () => {
    expect(pendingInstallmentsForPeriod([monthly], "2026-11", ["d1"])).toEqual([]);
  });

  it("carries the rounding leftover on the last installment of a deferred debt", () => {
    const [last] = pendingInstallmentsForPeriod([deferred], "2026-12", []);
    expect(last?.amountMinor).toBe(1000 - 333 * 2);
  });

  it("handles several debts independently", () => {
    const result = pendingInstallmentsForPeriod([monthly, deferred], "2026-11", ["d2"]);
    expect(result.map((item) => item.debtId)).toEqual(["d1"]);
  });
});
