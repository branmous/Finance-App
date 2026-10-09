import { describe, expect, it } from "vitest";

import {
  debtProgress,
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
        name: "Motorbike insurance",
        categoryId: valid.categoryId,
        installmentMinor: 300,
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
});
