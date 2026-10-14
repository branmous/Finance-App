import { describe, expect, it } from "vitest";

import { perPersonMinor, tripYearSpan } from "../../src/dashboard/trips";

describe("perPersonMinor", () => {
  it("splits the total between the participants, rounded", () => {
    expect(perPersonMinor(1_000_000, 4)).toBe(250_000);
    expect(perPersonMinor(100, 3)).toBe(33);
  });

  it("is the whole total without participants", () => {
    expect(perPersonMinor(500, 0)).toBe(500);
  });
});

describe("tripYearSpan", () => {
  it("places a trip on the year line as percentages", () => {
    const span = tripYearSpan("2026-07-01", "2026-07-31", 2026);
    expect(span?.startPct).toBeCloseTo((181 / 365) * 100, 1);
    expect(span?.widthPct).toBeCloseTo((31 / 365) * 100, 1);
  });

  it("clips a trip that crosses the year boundary", () => {
    const span = tripYearSpan("2026-12-20", "2027-01-10", 2026);
    expect(span?.startPct).toBeCloseTo((353 / 365) * 100, 1);
    expect(span && span.startPct + span.widthPct).toBeCloseTo(100, 5);
  });

  it("treats a single-day trip as one day wide", () => {
    expect(tripYearSpan("2026-03-05", "2026-03-05", 2026)?.widthPct).toBeCloseTo((1 / 365) * 100, 3);
    expect(tripYearSpan("2026-03-05", null, 2026)?.widthPct).toBeCloseTo((1 / 365) * 100, 3);
  });

  it("returns null without dates or outside the year", () => {
    expect(tripYearSpan(null, null, 2026)).toBeNull();
    expect(tripYearSpan("2025-05-01", "2025-05-10", 2026)).toBeNull();
  });
});
