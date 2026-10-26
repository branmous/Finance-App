import { describe, expect, it } from "vitest";

import {
  debtProgress,
  debtTotalMinor,
  deferredInstallmentMinor,
  installmentAmount,
  installmentPeriods,
  monthsBetween,
  validateDebtInput,
} from "../../src/debts/debt";

const valid = {
  name: "  Motorbike insurance ",
  categoryId: "3f1c2b7e-1a2b-4c3d-8e9f-0a1b2c3d4e5f",
  installmentMinor: 300,
  startPeriod: "2026-08",
  endPeriod: "2027-06",
  alreadyPaid: 3,
  note: "  ",
};

describe("monthsBetween", () => {
  it("counts both ends of the range", () => {
    expect(monthsBetween("2026-08", "2027-06")).toBe(11);
    expect(monthsBetween("2026-08", "2026-08")).toBe(1);
    expect(monthsBetween("2026-08", "2026-07")).toBe(0);
  });
});

describe("validateDebtInput", () => {
  it("accepts valid input, derives the installment count and trims text", () => {
    expect(validateDebtInput(valid)).toEqual({
      ok: true,
      value: {
        kind: "monthly",
        name: "Motorbike insurance",
        categoryId: valid.categoryId,
        installmentMinor: 300,
        totalMinor: null,
        startPeriod: "2026-08",
        totalInstallments: 11,
        alreadyPaid: 3,
        note: "",
      },
    });
  });

  it("defaults alreadyPaid to zero", () => {
    const result = validateDebtInput({ ...valid, alreadyPaid: undefined });
    expect(result.ok && result.value.alreadyPaid).toBe(0);
  });

  it("rejects bad fields with a message per field", () => {
    const result = validateDebtInput({
      name: " ",
      categoryId: "nope",
      installmentMinor: 0,
      startPeriod: "2026-13",
      endPeriod: "x",
      alreadyPaid: -1,
      note: "x".repeat(141),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual(
        ["alreadyPaid", "categoryId", "endPeriod", "installmentMinor", "name", "note", "startPeriod"].sort(),
      );
    }
  });

  it("rejects an end month before the start month", () => {
    const result = validateDebtInput({ ...valid, endPeriod: "2026-07" });
    expect(!result.ok && result.errors.endPeriod).toBeTruthy();
  });

  it("rejects more paid installments than the debt has", () => {
    const result = validateDebtInput({ ...valid, alreadyPaid: 12 });
    expect(!result.ok && result.errors.alreadyPaid).toBeTruthy();
  });

  it("rejects absurdly long debts", () => {
    const result = validateDebtInput({ ...valid, endPeriod: "2046-08" });
    expect(!result.ok && result.errors.endPeriod).toBeTruthy();
  });

  it("rejects non-object input", () => {
    expect(validateDebtInput(null).ok).toBe(false);
  });

  it("treats an unknown kind as invalid", () => {
    const result = validateDebtInput({ ...valid, kind: "weekly" });
    expect(!result.ok && result.errors.kind).toBeTruthy();
  });
});

describe("validateDebtInput (deferred)", () => {
  const deferred = {
    kind: "deferred",
    name: "Laptop",
    categoryId: "3f1c2b7e-1a2b-4c3d-8e9f-0a1b2c3d4e5f",
    totalMinor: 1_200_000,
    months: 12,
    startPeriod: "2026-01",
    alreadyPaid: 0,
    note: "",
  };

  it("derives the base installment and the installment count", () => {
    expect(validateDebtInput(deferred)).toEqual({
      ok: true,
      value: {
        kind: "deferred",
        name: "Laptop",
        categoryId: deferred.categoryId,
        installmentMinor: 100_000,
        totalMinor: 1_200_000,
        startPeriod: "2026-01",
        totalInstallments: 12,
        alreadyPaid: 0,
        note: "",
      },
    });
  });

  it("rounds the base installment down", () => {
    const result = validateDebtInput({ ...deferred, totalMinor: 1_000_000, months: 3 });
    expect(result.ok && result.value.installmentMinor).toBe(333_333);
  });

  it("accepts a single month", () => {
    const result = validateDebtInput({ ...deferred, months: 1 });
    expect(result.ok && result.value.installmentMinor).toBe(1_200_000);
  });

  it.each([0, -5, 1.5, "100", Number.NaN, undefined])("rejects total %s", (totalMinor) => {
    const result = validateDebtInput({ ...deferred, totalMinor });
    expect(!result.ok && result.errors.totalMinor).toBeTruthy();
  });

  it.each([0, -1, 1.5, "12", undefined])("rejects months %s", (months) => {
    const result = validateDebtInput({ ...deferred, months });
    expect(!result.ok && result.errors.months).toBeTruthy();
  });

  it("rejects more than the maximum number of installments", () => {
    const result = validateDebtInput({ ...deferred, months: 121 });
    expect(!result.ok && result.errors.months).toBeTruthy();
  });

  it("rejects a total smaller than the number of months", () => {
    const result = validateDebtInput({ ...deferred, totalMinor: 5, months: 6 });
    expect(!result.ok && result.errors.totalMinor).toEqual({ code: "totalTooSmall" });
  });

  it("rejects more paid installments than months", () => {
    const result = validateDebtInput({ ...deferred, alreadyPaid: 13 });
    expect(!result.ok && result.errors.alreadyPaid).toBeTruthy();
  });

  it("requires a valid start month", () => {
    const result = validateDebtInput({ ...deferred, startPeriod: "nope" });
    expect(!result.ok && result.errors.startPeriod).toBeTruthy();
  });
});

describe("deferredInstallmentMinor", () => {
  it("rounds down to whole pesos", () => {
    expect(deferredInstallmentMinor(1_200_000, 12)).toBe(100_000);
    expect(deferredInstallmentMinor(1_000_000, 3)).toBe(333_333);
  });
});

describe("installmentAmount", () => {
  const monthly = { kind: "monthly" as const, installmentMinor: 300, totalMinor: null, startPeriod: "2026-08", totalInstallments: 11 };
  const split = { kind: "deferred" as const, installmentMinor: 333_333, totalMinor: 1_000_000, startPeriod: "2026-01", totalInstallments: 3 };

  it("charges the same amount every month on a monthly debt", () => {
    expect(installmentAmount(monthly, "2026-08")).toBe(300);
    expect(installmentAmount(monthly, "2027-06")).toBe(300);
  });

  it("charges the leftover in the last installment of a deferred debt", () => {
    expect(installmentAmount(split, "2026-01")).toBe(333_333);
    expect(installmentAmount(split, "2026-02")).toBe(333_333);
    expect(installmentAmount(split, "2026-03")).toBe(333_334);
  });

  it("charges the whole total when deferred to one month", () => {
    const single = { kind: "deferred" as const, installmentMinor: 500, totalMinor: 500, startPeriod: "2026-01", totalInstallments: 1 };
    expect(installmentAmount(single, "2026-01")).toBe(500);
  });

  it("sums to the total owed, whatever the split", () => {
    for (const [total, months] of [[1_200_000, 12], [1_000_000, 3], [7, 3], [100, 7], [999_999, 120]] as const) {
      const debt = {
        kind: "deferred" as const,
        installmentMinor: deferredInstallmentMinor(total, months),
        totalMinor: total,
        startPeriod: "2026-01",
        totalInstallments: months,
      };
      const sum = installmentPeriods(debt).reduce((acc, period) => acc + installmentAmount(debt, period), 0);
      expect(sum).toBe(total);
      expect(debtTotalMinor(debt)).toBe(total);
    }
  });

  it("totals a monthly debt as installment times count", () => {
    expect(debtTotalMinor(monthly)).toBe(3300);
  });

  it("treats a debt without a kind as monthly", () => {
    expect(installmentAmount({ installmentMinor: 300, startPeriod: "2026-08", totalInstallments: 11 }, "2027-06")).toBe(300);
  });
});

describe("installmentPeriods", () => {
  it("lists every month of the debt", () => {
    const periods = installmentPeriods({ startPeriod: "2026-08", totalInstallments: 11 });
    expect(periods).toHaveLength(11);
    expect(periods[0]).toBe("2026-08");
    expect(periods[10]).toBe("2027-06");
  });
});

describe("debtProgress", () => {
  const debt = { startPeriod: "2026-08", totalInstallments: 11, installmentMinor: 300 };

  it("tracks paid, remaining and outstanding balance", () => {
    const progress = debtProgress(debt, ["2026-08", "2026-09", "2026-10"], "2026-10");
    expect(progress).toMatchObject({
      paidCount: 3,
      remainingCount: 8,
      remainingMinor: 2400,
      paidMinor: 900,
      percent: 27,
      endPeriod: "2027-06",
      overduePeriods: [],
      status: "active",
    });
  });

  it("flags unpaid months up to the current one as overdue", () => {
    const progress = debtProgress(debt, ["2026-08"], "2026-10");
    expect(progress.overduePeriods).toEqual(["2026-09", "2026-10"]);
    expect(progress.status).toBe("overdue");
  });

  it("is upcoming before the first installment", () => {
    expect(debtProgress(debt, [], "2026-05").status).toBe("upcoming");
  });

  it("is paid off when every installment is paid", () => {
    const all = installmentPeriods(debt);
    const progress = debtProgress(debt, all, "2027-01");
    expect(progress).toMatchObject({ status: "paid_off", remainingCount: 0, remainingMinor: 0, percent: 100 });
  });

  it("ignores paid periods outside the debt range", () => {
    expect(debtProgress(debt, ["2020-01"], "2026-10").paidCount).toBe(0);
  });

  describe("deferred", () => {
    const split = {
      kind: "deferred" as const,
      startPeriod: "2026-01",
      totalInstallments: 3,
      installmentMinor: 333_333,
      totalMinor: 1_000_000,
    };

    it("uses the real amount of each installment, including the adjusted last one", () => {
      const progress = debtProgress(split, ["2026-01", "2026-03"], "2026-02");
      expect(progress).toMatchObject({ paidCount: 2, paidMinor: 666_667, remainingMinor: 333_333 });
    });

    it("owes the exact total when nothing is paid", () => {
      expect(debtProgress(split, [], "2025-12")).toMatchObject({ paidMinor: 0, remainingMinor: 1_000_000 });
    });

    it("paid plus remaining is always the total, and a fully paid debt owes nothing", () => {
      const all = installmentPeriods(split);
      expect(debtProgress(split, all, "2026-06")).toMatchObject({
        status: "paid_off",
        paidMinor: 1_000_000,
        remainingMinor: 0,
        percent: 100,
      });
    });
  });
});
