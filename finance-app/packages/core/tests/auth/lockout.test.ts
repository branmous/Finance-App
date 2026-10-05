import { describe, expect, it } from "vitest";

import {
  LOCK_WINDOW_MS,
  MAX_ATTEMPTS,
  isLocked,
  nextFailureState,
} from "../../src/auth/lockout";

const NOW = new Date("2026-10-05T12:00:00Z");

describe("lockout policy", () => {
  it("does not lock before the maximum number of failures", () => {
    let state = { failedAttempts: 0, lockedUntil: null as Date | null };
    for (let i = 0; i < MAX_ATTEMPTS - 1; i++) {
      state = nextFailureState(state, NOW);
    }
    expect(state.failedAttempts).toBe(MAX_ATTEMPTS - 1);
    expect(isLocked(state, NOW)).toBe(false);
  });

  it("locks for the lock window after the maximum number of failures", () => {
    let state = { failedAttempts: 0, lockedUntil: null as Date | null };
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      state = nextFailureState(state, NOW);
    }
    expect(isLocked(state, NOW)).toBe(true);
    expect(state.lockedUntil?.getTime()).toBe(NOW.getTime() + LOCK_WINDOW_MS);
  });

  it("unlocks once the lock window has passed", () => {
    const lockedUntil = new Date(NOW.getTime() + LOCK_WINDOW_MS);
    const afterWindow = new Date(lockedUntil.getTime() + 1);
    expect(isLocked({ failedAttempts: MAX_ATTEMPTS, lockedUntil }, afterWindow)).toBe(false);
  });

  it("resets the failure counter when the lock window has expired", () => {
    const expired = {
      failedAttempts: MAX_ATTEMPTS,
      lockedUntil: new Date(NOW.getTime() - 1),
    };
    const next = nextFailureState(expired, NOW);
    expect(next.failedAttempts).toBe(1);
    expect(next.lockedUntil).toBeNull();
  });
});
