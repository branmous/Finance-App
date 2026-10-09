import { describe, expect, it } from "vitest";

import { computeBalance } from "../../src/budget/balance";

describe("computeBalance", () => {
  it("has no status to judge without income", () => {
    expect(computeBalance({ income: 0, spent: 500, paid: 200 })).toMatchObject({
      status: "no_income",
      usedPercent: 0,
      left: -500,
      leftNow: -200,
    });
  });

  it("is ok well under the income", () => {
    expect(computeBalance({ income: 3_000_000, spent: 1_000_000, paid: 400_000 })).toEqual({
      income: 3_000_000,
      spent: 1_000_000,
      left: 2_000_000,
      leftNow: 2_600_000,
      usedPercent: 33,
      status: "ok",
    });
  });

  it("is ok with nothing spent", () => {
    expect(computeBalance({ income: 100, spent: 0, paid: 0 })).toMatchObject({ status: "ok", usedPercent: 0, left: 100 });
  });

  it("is ok at exactly 80% and tight just above", () => {
    expect(computeBalance({ income: 1000, spent: 800, paid: 0 }).status).toBe("ok");
    expect(computeBalance({ income: 1000, spent: 810, paid: 0 }).status).toBe("tight");
  });

  it("is tight when spending exactly the income, with nothing left", () => {
    expect(computeBalance({ income: 1000, spent: 1000, paid: 1000 })).toMatchObject({
      status: "tight",
      left: 0,
      usedPercent: 100,
    });
  });

  it("is over when spending more than the income", () => {
    expect(computeBalance({ income: 1000, spent: 1500, paid: 1200 })).toMatchObject({
      status: "over",
      left: -500,
      leftNow: -200,
      usedPercent: 150,
    });
  });
});