import { describe, expect, it } from "vitest";

import { isUuid, validateExpenseInput } from "../../src/expenses/expense";

const valid = {
  categoryId: "3f1c2b7e-1a2b-4c3d-8e9f-0a1b2c3d4e5f",
  amountMinor: 2000000,
  period: "2026-09",
  paidOn: "2026-10-03",
  note: "  Rent  ",
};

describe("validateExpenseInput", () => {
  it("accepts valid input and trims the note", () => {
    expect(validateExpenseInput(valid)).toEqual({ ok: true, value: { ...valid, note: "Rent", parentId: null } });
  });

  it("allows paying in a different month than the period it belongs to", () => {
    expect(validateExpenseInput({ ...valid, period: "2026-09", paidOn: "2026-10-03" }).ok).toBe(true);
  });

  it("treats a missing or blank note as an empty string", () => {
    expect(validateExpenseInput({ ...valid, note: undefined })).toMatchObject({ ok: true, value: { note: "" } });
    expect(validateExpenseInput({ ...valid, note: "   " })).toMatchObject({ ok: true, value: { note: "" } });
  });

  it.each([null, undefined, "", "   "])("treats paid date %j as not paid yet", (paidOn) => {
    expect(validateExpenseInput({ ...valid, paidOn })).toMatchObject({ ok: true, value: { paidOn: null } });
  });

  it.each([null, undefined, "", "   "])("treats parent %j as independent", (parentId) => {
    expect(validateExpenseInput({ ...valid, parentId })).toMatchObject({ ok: true, value: { parentId: null } });
  });

  it("keeps a valid parent id", () => {
    const parentId = "9a1c2b7e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";
    expect(validateExpenseInput({ ...valid, parentId })).toMatchObject({ ok: true, value: { parentId } });
  });

  it.each(["nope", 42, {}])("rejects parent %j", (parentId) => {
    const result = validateExpenseInput({ ...valid, parentId });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.parentId).toBeTruthy();
  });

  it("recognizes uuids", () => {
    expect(isUuid(valid.categoryId)).toBe(true);
    expect(isUuid("nope")).toBe(false);
    expect(isUuid(42)).toBe(false);
  });

  it("rejects non-object input", () => {
    expect(validateExpenseInput(null).ok).toBe(false);
  });

  it.each([0, -5, 10.5, "100", Number.NaN, Number.MAX_SAFE_INTEGER + 1])("rejects amount %s", (amountMinor) => {
    const result = validateExpenseInput({ ...valid, amountMinor });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.amountMinor).toBeTruthy();
  });

  it("rejects an invalid category id", () => {
    const result = validateExpenseInput({ ...valid, categoryId: "nope" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.categoryId).toBeTruthy();
  });

  it("rejects an invalid period", () => {
    const result = validateExpenseInput({ ...valid, period: "2026-13" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.period).toBeTruthy();
  });

  it.each(["2026-02-30", "2026-10", "03/10/2026", 20261003])("rejects paid date %j", (paidOn) => {
    const result = validateExpenseInput({ ...valid, paidOn });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.paidOn).toBeTruthy();
  });

  it("rejects a note longer than the limit", () => {
    const result = validateExpenseInput({ ...valid, note: "x".repeat(141) });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.note).toBeTruthy();
  });
});
