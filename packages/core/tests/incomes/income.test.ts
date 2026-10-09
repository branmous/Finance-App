import { describe, expect, it } from "vitest";

import { validateIncomeInput } from "../../src/incomes/income";

const valid = { type: "payroll", amountMinor: 3_000_000, period: "2026-10", note: "October salary" };

describe("validateIncomeInput", () => {
  it("accepts a valid income", () => {
    expect(validateIncomeInput(valid)).toEqual({ ok: true, value: valid });
  });

  it("trims the note and defaults it to blank", () => {
    const result = validateIncomeInput({ ...valid, note: "  hi  " });
    expect(result.ok && result.value.note).toBe("hi");
    const missing = validateIncomeInput({ ...valid, note: undefined });
    expect(missing.ok && missing.value.note).toBe("");
  });

  it.each([0, -5, 10.5, "100", NaN, Number.MAX_SAFE_INTEGER + 1])("rejects amount %p", (amountMinor) => {
    const result = validateIncomeInput({ ...valid, amountMinor });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.amountMinor).toBeDefined();
  });

  it.each(["2026-13", "2026-1", "", 5])("rejects period %p", (period) => {
    const result = validateIncomeInput({ ...valid, period });
    expect(!result.ok && result.errors.period).toBeTruthy();
  });

  it("rejects an unknown type", () => {
    const result = validateIncomeInput({ ...valid, type: "lottery" });
    expect(!result.ok && result.errors.type).toBeTruthy();
  });

  it("rejects a note over 140 characters", () => {
    const result = validateIncomeInput({ ...valid, note: "x".repeat(141) });
    expect(!result.ok && result.errors.note).toBeTruthy();
  });

  it("rejects non-object input", () => {
    expect(validateIncomeInput(null).ok).toBe(false);
    expect(validateIncomeInput("x").ok).toBe(false);
  });
});
