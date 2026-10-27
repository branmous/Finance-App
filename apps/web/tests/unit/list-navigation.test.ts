import { describe, expect, it } from "vitest";

import { nextActiveIndex } from "../../lib/list-navigation";

describe("nextActiveIndex", () => {
  it("moves down and wraps to the first option", () => {
    expect(nextActiveIndex(-1, "ArrowDown", 3)).toBe(0);
    expect(nextActiveIndex(1, "ArrowDown", 3)).toBe(2);
    expect(nextActiveIndex(2, "ArrowDown", 3)).toBe(0);
  });

  it("moves up and wraps to the last option", () => {
    expect(nextActiveIndex(2, "ArrowUp", 3)).toBe(1);
    expect(nextActiveIndex(0, "ArrowUp", 3)).toBe(2);
    expect(nextActiveIndex(-1, "ArrowUp", 3)).toBe(2);
  });

  it("jumps to either end", () => {
    expect(nextActiveIndex(1, "Home", 4)).toBe(0);
    expect(nextActiveIndex(1, "End", 4)).toBe(3);
  });

  it("has nothing to highlight in an empty list", () => {
    expect(nextActiveIndex(0, "ArrowDown", 0)).toBe(-1);
  });
});
