import { describe, expect, it } from "vitest";

import { isPositiveInteger } from "../src/index";

describe("isPositiveInteger", () => {
  it("returns true for positive integers", () => {
    expect(isPositiveInteger(1)).toBe(true);
    expect(isPositiveInteger(1200000)).toBe(true);
  });

  it("returns false for zero, negatives, and non-integers", () => {
    expect(isPositiveInteger(0)).toBe(false);
    expect(isPositiveInteger(-5)).toBe(false);
    expect(isPositiveInteger(1.5)).toBe(false);
  });
});
