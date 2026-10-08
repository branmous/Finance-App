import { describe, expect, it } from "vitest";

import { computeTripSummary, splitAmount } from "../../src/travels/split";

const ids = Array.from({ length: 13 }, (_, i) => `p${i}`);

describe("splitAmount", () => {
  it("splits exactly among 13 people and keeps the total", () => {
    const shares = splitAmount(1_000_000, ids);
    expect(Object.values(shares).reduce((a, b) => a + b, 0)).toBe(1_000_000);
    expect(Math.max(...Object.values(shares)) - Math.min(...Object.values(shares))).toBeLessThanOrEqual(1);
  });

  it("gives the leftover pesos to the first people", () => {
    expect(splitAmount(10, ["a", "b", "c"])).toEqual({ a: 4, b: 3, c: 3 });
  });

  it("recalculates when someone is left out", () => {
    const shares = splitAmount(1_200_000, ids.slice(1));
    expect(Object.keys(shares)).toHaveLength(12);
    expect(shares.p1).toBe(100_000);
    expect(shares.p0).toBeUndefined();
  });

  it("returns nothing for nobody", () => {
    expect(splitAmount(100, [])).toEqual({});
  });
});

describe("computeTripSummary", () => {
  const people = [
    { id: "me", name: "Me" },
    { id: "ana", name: "Ana" },
    { id: "leo", name: "Leo" },
  ];

  it("credits the payer and charges everyone included", () => {
    const summary = computeTripSummary(
      people,
      [{ amountMinor: 300_000, category: "lodging", status: "paid", paidById: "me", shareIds: ["me", "ana", "leo"] }],
      [],
    );
    const by = Object.fromEntries(summary.people.map((p) => [p.id, p.balanceMinor]));
    expect(by).toEqual({ me: 200_000, ana: -100_000, leo: -100_000 });
    expect(summary.paidMinor).toBe(300_000);
  });

  it("does not charge a person who is excluded from an expense", () => {
    const summary = computeTripSummary(
      people,
      [{ amountMinor: 200_000, category: "food", status: "paid", paidById: "me", shareIds: ["me", "ana"] }],
      [],
    );
    expect(summary.people.find((p) => p.id === "leo")?.balanceMinor).toBe(0);
    expect(summary.people.find((p) => p.id === "ana")?.balanceMinor).toBe(-100_000);
  });

  it("keeps pending expenses out of the balances", () => {
    const summary = computeTripSummary(
      people,
      [{ amountMinor: 90_000, category: "transport", status: "pending", paidById: null, shareIds: ["me", "ana", "leo"] }],
      [],
    );
    expect(summary.pendingMinor).toBe(90_000);
    expect(summary.paidMinor).toBe(0);
    expect(summary.people.every((p) => p.balanceMinor === 0)).toBe(true);
    expect(summary.people[0]?.pendingShareMinor).toBe(30_000);
  });

  it("applies settlements to both people", () => {
    const summary = computeTripSummary(
      people,
      [{ amountMinor: 300_000, category: "lodging", status: "paid", paidById: "me", shareIds: ["me", "ana", "leo"] }],
      [{ fromId: "ana", toId: "me", amountMinor: 100_000 }],
    );
    const by = Object.fromEntries(summary.people.map((p) => [p.id, p.balanceMinor]));
    expect(by).toEqual({ me: 100_000, ana: 0, leo: -100_000 });
    // Balances always net to zero.
    expect(Object.values(by).reduce((a, b) => a + b, 0)).toBe(0);
  });

  it("totals by category", () => {
    const summary = computeTripSummary(
      people.slice(0, 1),
      [
        { amountMinor: 500_000, category: "flights", status: "paid", paidById: "me", shareIds: ["me"] },
        { amountMinor: 200_000, category: "flights", status: "pending", paidById: null, shareIds: ["me"] },
        { amountMinor: 50_000, category: "food", status: "paid", paidById: "me", shareIds: ["me"] },
      ],
      [],
    );
    expect(summary.byCategory).toEqual({ flights: 700_000, food: 50_000 });
    expect(summary.totalMinor).toBe(750_000);
  });
});
