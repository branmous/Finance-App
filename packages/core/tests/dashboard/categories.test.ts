import { describe, expect, it } from "vitest";

import {
  commitment,
  mergeCategoryTotals,
  topWithRest,
  type CategoryTotal,
} from "../../src/dashboard/categories";

function total(id: string, totalMinor: number, type = "other"): CategoryTotal {
  return { categoryId: id, name: id.toUpperCase(), type, color: "#000", icon: "tag", totalMinor };
}

describe("mergeCategoryTotals", () => {
  it("joins both months by category and sorts by the absolute peso change", () => {
    const rows = mergeCategoryTotals(
      [total("food", 900), total("rent", 2000), total("fun", 300)],
      [total("food", 600), total("rent", 2000), total("fun", 800)],
    );
    expect(rows.map((row) => [row.categoryId, row.deltaMinor])).toEqual([
      ["fun", -500],
      ["food", 300],
      ["rent", 0],
    ]);
    expect(rows[1]).toMatchObject({ currentMinor: 900, previousMinor: 600, deltaPercent: 50, isNew: false });
  });

  it("marks a category with spending only this month as new, without percentage", () => {
    const [row] = mergeCategoryTotals([total("trip", 700)], []);
    expect(row).toMatchObject({ currentMinor: 700, previousMinor: 0, deltaMinor: 700, deltaPercent: null, isNew: true });
  });

  it("keeps a category that only spent last month, with a negative change", () => {
    const [row] = mergeCategoryTotals([], [total("gym", 400)]);
    expect(row).toMatchObject({ currentMinor: 0, previousMinor: 400, deltaMinor: -400, deltaPercent: -100, isNew: false });
  });

  it("breaks ties by current spending, then by name", () => {
    const rows = mergeCategoryTotals(
      [total("b", 100), total("a", 100), total("c", 300)],
      [total("b", 100), total("a", 100), total("c", 300)],
    );
    expect(rows.map((row) => row.categoryId)).toEqual(["c", "a", "b"]);
  });

  it("returns nothing for two empty months", () => {
    expect(mergeCategoryTotals([], [])).toEqual([]);
  });
});

describe("topWithRest", () => {
  const rows = mergeCategoryTotals(
    ["a", "b", "c", "d"].map((id, index) => total(id, 1000 * (index + 1))),
    [],
  );

  it("keeps everything when it fits", () => {
    const { top, rest } = topWithRest(rows, 6);
    expect(top).toHaveLength(4);
    expect(rest).toBeNull();
  });

  it("groups what does not fit into a single rest entry", () => {
    const { top, rest } = topWithRest(rows, 2);
    expect(top.map((row) => row.categoryId)).toEqual(["d", "c"]);
    expect(rest).toEqual({ count: 2, currentMinor: 3000, previousMinor: 0, deltaMinor: 3000 });
  });

  it("defaults to six", () => {
    const many = mergeCategoryTotals(
      Array.from({ length: 8 }, (_, index) => total(`c${index}`, 100 + index)),
      [],
    );
    expect(topWithRest(many).top).toHaveLength(6);
    expect(topWithRest(many).rest?.count).toBe(2);
  });
});

describe("commitment", () => {
  const categories = [
    total("rent", 1_500_000, "fixed"),
    total("netflix", 500_000, "subscription"),
    total("food", 800_000, "household"),
  ];

  it("adds fixed and subscription spending and expresses it against income", () => {
    expect(commitment({ categories, income: 5_000_000 })).toEqual({
      fixedMinor: 1_500_000,
      subscriptionMinor: 500_000,
      totalMinor: 2_000_000,
      percentOfIncome: 40,
    });
  });

  it("has no percentage without income", () => {
    expect(commitment({ categories, income: 0 }).percentOfIncome).toBeNull();
  });

  it("is zero without fixed or subscription categories", () => {
    expect(commitment({ categories: [total("food", 10, "household")], income: 100 })).toMatchObject({
      totalMinor: 0,
      percentOfIncome: 0,
    });
  });
});
