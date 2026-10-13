import { describe, expect, it } from "vitest";

import { mergeCategoryTotals } from "../../src/dashboard/categories";
import {
  ALERT_CATEGORY_RISE_MIN_MINOR,
  ALERT_CATEGORY_RISE_PERCENT,
  ALERT_TIGHT_MARGIN_PERCENT,
  MAX_ALERTS,
  buildAlerts,
  type AlertInput,
} from "../../src/dashboard/alerts";

const quiet: AlertInput = {
  income: 5_000_000,
  spent: 3_000_000,
  pendingCount: 0,
  pendingMinor: 0,
  categories: [],
  subscriptionMinor: 0,
  overdueInstallments: 0,
  unsettledTrips: 0,
};

function categoryRows(current: number, previous: number) {
  const row = (totalMinor: number) => ({
    categoryId: "food",
    name: "Food",
    type: "household",
    color: "#000",
    icon: "tag",
    totalMinor,
  });
  return mergeCategoryTotals([row(current)], [row(previous)]);
}

const codes = (input: Partial<AlertInput>) => buildAlerts({ ...quiet, ...input }).map((alert) => alert.code);

describe("buildAlerts", () => {
  it("has nothing to say when everything is fine", () => {
    expect(buildAlerts(quiet)).toEqual([]);
  });

  describe("deficit", () => {
    it("fires when spending exceeds income and reports the gap", () => {
      expect(buildAlerts({ ...quiet, spent: 5_000_001 })).toContainEqual({
        code: "deficit",
        severity: "high",
        params: { amount: 1 },
      });
    });
    it("does not fire when spending equals income, and never without income", () => {
      expect(codes({ spent: 5_000_000 })).not.toContain("deficit");
      expect(codes({ income: 0, spent: 100 })).not.toContain("deficit");
    });
  });

  describe("tightMargin", () => {
    it("fires just under the threshold", () => {
      const spent = 5_000_000 * (1 - (ALERT_TIGHT_MARGIN_PERCENT - 1) / 100);
      expect(buildAlerts({ ...quiet, spent })).toContainEqual({
        code: "tightMargin",
        severity: "medium",
        params: { percent: 19 },
      });
    });
    it("does not fire exactly at the threshold, in deficit or without income", () => {
      expect(codes({ spent: 4_000_000 })).not.toContain("tightMargin");
      expect(codes({ spent: 6_000_000 })).not.toContain("tightMargin");
      expect(codes({ income: 0, spent: 10 })).not.toContain("tightMargin");
    });
  });

  describe("categoryRise", () => {
    it("fires exactly at both thresholds", () => {
      const previous = ALERT_CATEGORY_RISE_MIN_MINOR * 5; // 250.000 → +20 % = 50.000
      const current = previous + ALERT_CATEGORY_RISE_MIN_MINOR;
      expect(ALERT_CATEGORY_RISE_PERCENT).toBe(20);
      expect(buildAlerts({ ...quiet, categories: categoryRows(current, previous) })).toContainEqual({
        code: "categoryRise",
        severity: "medium",
        params: { category: "Food", percent: 20, amount: 50_000 },
      });
    });
    it("does not fire just below the percentage", () => {
      expect(codes({ categories: categoryRows(1_199_999, 1_000_000) })).not.toContain("categoryRise");
    });
    it("does not fire just below the minimum peso increase", () => {
      expect(codes({ categories: categoryRows(149_999, 100_000) })).not.toContain("categoryRise");
    });
    it("ignores new categories (no percentage) and picks only the biggest rise", () => {
      expect(codes({ categories: mergeCategoryTotals([{ categoryId: "n", name: "N", type: "other", color: "", icon: "", totalMinor: 900_000 }], []) })).not.toContain("categoryRise");
      const rows = mergeCategoryTotals(
        [
          { categoryId: "a", name: "A", type: "other", color: "", icon: "", totalMinor: 400_000 },
          { categoryId: "b", name: "B", type: "other", color: "", icon: "", totalMinor: 900_000 },
        ],
        [
          { categoryId: "a", name: "A", type: "other", color: "", icon: "", totalMinor: 200_000 },
          { categoryId: "b", name: "B", type: "other", color: "", icon: "", totalMinor: 500_000 },
        ],
      );
      const rise = buildAlerts({ ...quiet, categories: rows }).filter((alert) => alert.code === "categoryRise");
      expect(rise).toHaveLength(1);
      expect(rise[0]?.params.category).toBe("B"); // +400.000 pesos beats +200.000, though A rose more in percent
    });
  });

  it("pendingPayments reports count and amount, only when there are some", () => {
    expect(buildAlerts({ ...quiet, pendingCount: 5, pendingMinor: 750_000 })).toContainEqual({
      code: "pendingPayments",
      severity: "medium",
      params: { count: 5, amount: 750_000 },
    });
    expect(codes({ pendingCount: 0 })).not.toContain("pendingPayments");
  });

  it("overdueInstallments is high severity", () => {
    expect(buildAlerts({ ...quiet, overdueInstallments: 2 })).toContainEqual({
      code: "overdueInstallments",
      severity: "high",
      params: { count: 2 },
    });
  });

  it("unsettledTrips is low severity", () => {
    expect(buildAlerts({ ...quiet, unsettledTrips: 1 })).toContainEqual({
      code: "unsettledTrips",
      severity: "low",
      params: { count: 1 },
    });
  });

  it("subscriptions reports the amount and its share of income when there is income", () => {
    expect(buildAlerts({ ...quiet, subscriptionMinor: 250_000 })).toContainEqual({
      code: "subscriptions",
      severity: "low",
      params: { amount: 250_000, percent: 5 },
    });
    const noIncome = buildAlerts({ ...quiet, income: 0, spent: 0, subscriptionMinor: 10 });
    expect(noIncome.find((alert) => alert.code === "subscriptions")?.params).toEqual({ amount: 10 });
  });

  it("orders by severity then by rule and keeps at most four", () => {
    const alerts = buildAlerts({
      ...quiet,
      spent: 6_000_000,
      pendingCount: 2,
      pendingMinor: 10,
      categories: categoryRows(1_200_000, 1_000_000),
      subscriptionMinor: 100,
      overdueInstallments: 1,
      unsettledTrips: 1,
    });
    expect(MAX_ALERTS).toBe(4);
    expect(alerts.map((alert) => alert.code)).toEqual([
      "deficit",
      "overdueInstallments",
      "categoryRise",
      "pendingPayments",
    ]);
  });
});
