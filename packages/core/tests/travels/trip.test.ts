import { describe, expect, it } from "vitest";

import { validateTripExpenseInput, validateTripInput, validateTripSettlementInput } from "../../src/travels/trip";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

describe("validateTripInput", () => {
  it("accepts a group trip and trims names", () => {
    const result = validateTripInput({
      name: " Santander ",
      kind: "group",
      startDate: "2026-12-20",
      endDate: "2026-12-28",
      participants: [" Me ", "Ana", ""],
    });
    expect(result).toEqual({
      ok: true,
      value: {
        name: "Santander",
        kind: "group",
        startDate: "2026-12-20",
        endDate: "2026-12-28",
        participants: ["Me", "Ana"],
      },
    });
  });

  it("requires exactly one person for an individual trip and two for a group", () => {
    const base = { name: "T", startDate: "", endDate: "" };
    expect(validateTripInput({ ...base, kind: "individual", participants: ["Me", "Ana"] }).ok).toBe(false);
    expect(validateTripInput({ ...base, kind: "group", participants: ["Me"] }).ok).toBe(false);
    expect(validateTripInput({ ...base, kind: "individual", participants: ["Me"] }).ok).toBe(true);
  });

  it("rejects duplicate names, bad dates and an end before the start", () => {
    const result = validateTripInput({
      name: "T",
      kind: "group",
      startDate: "2026-12-20",
      endDate: "2026-12-01",
      participants: ["Ana", "ana"],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.participants).toEqual({ code: "duplicatePeople" });
      expect(result.errors.endDate).toEqual({ code: "endDateBeforeStart" });
    }
    expect(
      validateTripInput({ name: "T", kind: "individual", startDate: "2026-02-31", participants: ["Me"] }).ok,
    ).toBe(false);
  });
});

describe("validateTripExpenseInput", () => {
  const base = { description: "Hotel", category: "lodging", amountMinor: 1_000_000, spentOn: "", shareIds: [A, B] };

  it("accepts a paid expense with a payer", () => {
    const result = validateTripExpenseInput({ ...base, status: "paid", paidById: A });
    expect(result).toMatchObject({ ok: true, value: { status: "paid", paidById: A, spentOn: null } });
  });

  it("requires a payer when paid and drops it when pending", () => {
    expect(validateTripExpenseInput({ ...base, status: "paid", paidById: null }).ok).toBe(false);
    const pending = validateTripExpenseInput({ ...base, status: "pending", paidById: A });
    expect(pending).toMatchObject({ ok: true, value: { paidById: null } });
  });

  it("requires at least one person and a positive integer amount", () => {
    expect(validateTripExpenseInput({ ...base, status: "pending", shareIds: [] }).ok).toBe(false);
    expect(validateTripExpenseInput({ ...base, status: "pending", amountMinor: 0 }).ok).toBe(false);
    expect(validateTripExpenseInput({ ...base, status: "pending", amountMinor: 10.5 }).ok).toBe(false);
  });
});

describe("validateTripSettlementInput", () => {
  it("needs two different people and a positive amount", () => {
    expect(validateTripSettlementInput({ fromId: A, toId: B, amountMinor: 5000 }).ok).toBe(true);
    expect(validateTripSettlementInput({ fromId: A, toId: A, amountMinor: 5000 }).ok).toBe(false);
    expect(validateTripSettlementInput({ fromId: A, toId: B, amountMinor: 0 }).ok).toBe(false);
  });
});
