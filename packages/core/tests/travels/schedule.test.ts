import { describe, expect, it } from "vitest";

import { computeTripSchedule, todayIso } from "../../src/travels/schedule";

describe("computeTripSchedule", () => {
  it("is upcoming before the start and counts the days left", () => {
    expect(computeTripSchedule("2026-11-10", "2026-11-17", "2026-11-01")).toMatchObject({
      phase: "upcoming",
      daysUntilStart: 9,
      totalDays: 8,
    });
    expect(computeTripSchedule("2026-11-10", "2026-11-17", "2026-11-09").daysUntilStart).toBe(1);
  });

  it("is ongoing from the first day to the last, both included", () => {
    expect(computeTripSchedule("2026-11-10", "2026-11-17", "2026-11-10")).toMatchObject({
      phase: "ongoing",
      dayNumber: 1,
      daysLeft: 7,
      totalDays: 8,
    });
    expect(computeTripSchedule("2026-11-10", "2026-11-17", "2026-11-17")).toMatchObject({
      phase: "ongoing",
      dayNumber: 8,
      daysLeft: 0,
    });
  });

  it("is finished the day after the end and counts the days since", () => {
    expect(computeTripSchedule("2026-11-10", "2026-11-17", "2026-11-18")).toMatchObject({
      phase: "finished",
      daysSinceEnd: 1,
    });
    expect(computeTripSchedule("2026-11-10", "2026-11-17", "2026-12-17").daysSinceEnd).toBe(30);
  });

  it("treats a trip with one date as a one-day trip", () => {
    expect(computeTripSchedule("2026-11-10", null, "2026-11-10")).toMatchObject({ phase: "ongoing", totalDays: 1 });
    expect(computeTripSchedule(null, "2026-11-10", "2026-11-11").phase).toBe("finished");
    expect(computeTripSchedule("2026-11-10", null, "2026-11-01").phase).toBe("upcoming");
  });

  it("has no schedule without dates", () => {
    expect(computeTripSchedule(null, null, "2026-11-01")).toMatchObject({ phase: "undated", totalDays: null });
  });

  it("counts across month, year and leap-day boundaries", () => {
    expect(computeTripSchedule("2027-01-02", "2027-01-05", "2026-12-30").daysUntilStart).toBe(3);
    expect(computeTripSchedule("2028-03-01", "2028-03-02", "2028-02-28").daysUntilStart).toBe(2);
  });
});

describe("todayIso", () => {
  it("formats the local calendar day with zero padding", () => {
    expect(todayIso(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(todayIso(new Date(2026, 10, 30, 0, 1))).toBe("2026-11-30");
  });
});
