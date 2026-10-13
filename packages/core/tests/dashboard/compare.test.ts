import { describe, expect, it } from "vitest";

import { compareAmounts, savingsRate } from "../../src/dashboard/compare";

describe("compareAmounts", () => {
  it("reports the delta and the percentage against the previous amount", () => {
    expect(compareAmounts(3_500_000, 4_000_000)).toEqual({
      current: 3_500_000,
      previous: 4_000_000,
      delta: -500_000,
      deltaPercent: -12.5,
    });
  });

  it("rounds the percentage to one decimal", () => {
    expect(compareAmounts(4_000_000, 4_500_000).deltaPercent).toBe(-11.1);
  });

  it("has no percentage when there is no previous amount", () => {
    expect(compareAmounts(100, 0)).toMatchObject({ delta: 100, deltaPercent: null });
    expect(compareAmounts(0, 0)).toMatchObject({ delta: 0, deltaPercent: null });
  });

  it("handles a drop to zero", () => {
    expect(compareAmounts(0, 200)).toMatchObject({ delta: -200, deltaPercent: -100 });
  });
});

describe("savingsRate", () => {
  it("is the share of income that is left", () => {
    expect(savingsRate(5_000_000, 4_000_000)).toBe(20);
  });

  it("can be negative when spending exceeds income", () => {
    expect(savingsRate(1_000, 1_500)).toBe(-50);
  });

  it("rounds to one decimal", () => {
    expect(savingsRate(3, 2)).toBe(33.3);
  });

  it("is unavailable without income", () => {
    expect(savingsRate(0, 100)).toBeNull();
    expect(savingsRate(-5, 0)).toBeNull();
  });
});
