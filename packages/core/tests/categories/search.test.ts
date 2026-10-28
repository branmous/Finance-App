import { describe, expect, it } from "vitest";

import { filterCategories, findExactCategory } from "../../src/categories/search";

const items = [{ name: "Café" }, { name: "Arriendo" }, { name: "Netflix" }, { name: "Caja de compensación" }];

describe("filterCategories", () => {
  it("ignores case and accents", () => {
    expect(filterCategories(items, "CAFE")).toEqual([{ name: "Café" }]);
    expect(filterCategories(items, "compensacion")).toEqual([{ name: "Caja de compensación" }]);
  });

  it("matches anywhere in the name", () => {
    expect(filterCategories(items, "ri")).toEqual([{ name: "Arriendo" }]);
    expect(filterCategories(items, "ca").map((item) => item.name)).toEqual(["Café", "Caja de compensación"]);
  });

  it("keeps everything for an empty or blank query", () => {
    expect(filterCategories(items, "")).toHaveLength(4);
    expect(filterCategories(items, "   ")).toHaveLength(4);
  });

  it("returns nothing when no name matches", () => {
    expect(filterCategories(items, "zzz")).toEqual([]);
  });
});

describe("findExactCategory", () => {
  it("finds a name ignoring case, accents and surrounding spaces", () => {
    expect(findExactCategory(items, "  cafe ")).toEqual({ name: "Café" });
  });

  it("does not match a partial name or a blank query", () => {
    expect(findExactCategory(items, "Caf")).toBeUndefined();
    expect(findExactCategory(items, "  ")).toBeUndefined();
  });
});
