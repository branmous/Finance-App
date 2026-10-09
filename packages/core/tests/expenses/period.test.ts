import { describe, expect, it } from "vitest";

import { currentPeriod, formatCop, formatPeriod, isValidPeriod, shiftPeriod } from "../../src/expenses/period";

describe("period helpers", () => {
  it("validates YYYY-MM periods", () => {
    expect(isValidPeriod("2026-09")).toBe(true);
    expect(isValidPeriod("2026-13")).toBe(false);
    expect(isValidPeriod("2026-00")).toBe(false);
    expect(isValidPeriod("2026-9")).toBe(false);
    expect(isValidPeriod(202609)).toBe(false);
  });

  it("shifts periods across year boundaries", () => {
    expect(shiftPeriod("2026-01", -1)).toBe("2025-12");
    expect(shiftPeriod("2026-12", 1)).toBe("2027-01");
    expect(shiftPeriod("2026-10", -1)).toBe("2026-09");
    expect(shiftPeriod("2026-10", 0)).toBe("2026-10");
  });

  it("derives the current period from a date", () => {
    expect(currentPeriod(new Date(2026, 9, 6))).toBe("2026-10");
    expect(currentPeriod(new Date(2026, 0, 31))).toBe("2026-01");
  });

  it("formats a period as month and year", () => {
    expect(formatPeriod("2026-09")).toBe("September 2026");
  });

  it("formats whole pesos as COP without decimals", () => {
    const formatted = formatCop(2000000);
    expect(formatted).toContain("2.000.000");
    expect(formatted).not.toContain(",");
  });
});
