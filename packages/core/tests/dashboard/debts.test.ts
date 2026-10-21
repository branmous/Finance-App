import { describe, expect, it } from "vitest";

import { debtsOverview } from "../../src/dashboard/debts";

const car = { startPeriod: "2026-01", totalInstallments: 12, installmentMinor: 500_000, paidPeriods: [] as string[] };

describe("debtsOverview", () => {
  it("adds the installments that fall in the period, restants and the last end month", () => {
    const loan = { startPeriod: "2026-08", totalInstallments: 6, installmentMinor: 200_000, paidPeriods: ["2026-08", "2026-09"] };
    const overview = debtsOverview(
      [{ ...car, paidPeriods: ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"] }, loan],
      "2026-09",
      "2026-09",
    );
    expect(overview).toEqual({
      monthlyMinor: 700_000,
      remainingInstallments: 3 + 4,
      endPeriod: "2027-01",
      overdueInstallments: 0,
    });
  });

  it("counts overdue installments up to the current month", () => {
    const overview = debtsOverview([{ ...car, paidPeriods: ["2026-01"] }], "2026-09", "2026-09");
    expect(overview.overdueInstallments).toBe(8); // 2026-02 .. 2026-09
  });

  it("leaves out paid-off debts and ones that do not charge in the period", () => {
    const paidOff = { ...car, totalInstallments: 2, paidPeriods: ["2026-01", "2026-02"] };
    const later = { startPeriod: "2026-11", totalInstallments: 3, installmentMinor: 100, paidPeriods: [] as string[] };
    const overview = debtsOverview([paidOff, later], "2026-09", "2026-10");
    expect(overview.monthlyMinor).toBe(0);
    expect(overview.endPeriod).toBe("2027-01");
    expect(overview.remainingInstallments).toBe(3);
  });

  it("charges the adjusted last installment of a deferred debt in its month", () => {
    const split = {
      kind: "deferred" as const,
      startPeriod: "2026-07",
      totalInstallments: 3,
      installmentMinor: 333_333,
      totalMinor: 1_000_000,
      paidPeriods: [] as string[],
    };
    expect(debtsOverview([split], "2026-07", "2026-07").monthlyMinor).toBe(333_333);
    expect(debtsOverview([split], "2026-08", "2026-08").monthlyMinor).toBe(333_333);
    expect(debtsOverview([split], "2026-09", "2026-09").monthlyMinor).toBe(333_334);
    expect(debtsOverview([split], "2026-10", "2026-10").monthlyMinor).toBe(0);
  });

  it("is empty without debts", () => {
    expect(debtsOverview([], "2026-09", "2026-10")).toEqual({
      monthlyMinor: 0,
      remainingInstallments: 0,
      endPeriod: null,
      overdueInstallments: 0,
    });
  });
});
