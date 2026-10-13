import { describe, expect, it } from "vitest";

import { buildTrend, trendPeriods } from "../../src/dashboard/trend";

describe("trendPeriods", () => {
  it("ends at the given period and runs oldest to newest", () => {
    expect(trendPeriods("2026-09")).toEqual(["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"]);
  });

  it("crosses the year boundary", () => {
    expect(trendPeriods("2026-02", 4)).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
  });
});

describe("buildTrend", () => {
  it("fills months without data with zero", () => {
    const periods = trendPeriods("2026-09", 3);
    expect(
      buildTrend(
        periods,
        [{ period: "2026-09", totalMinor: 900 }],
        [
          { period: "2026-07", totalMinor: 1000 },
          { period: "2026-09", totalMinor: 1200 },
        ],
      ),
    ).toEqual([
      { period: "2026-07", incomeMinor: 1000, spentMinor: 0 },
      { period: "2026-08", incomeMinor: 0, spentMinor: 0 },
      { period: "2026-09", incomeMinor: 1200, spentMinor: 900 },
    ]);
  });

  it("ignores data outside the requested months", () => {
    expect(buildTrend(["2026-09"], [{ period: "2025-01", totalMinor: 5 }], [])).toEqual([
      { period: "2026-09", incomeMinor: 0, spentMinor: 0 },
    ]);
  });
});
