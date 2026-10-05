export const MAX_ATTEMPTS = 5;
export const LOCK_WINDOW_MS = 15 * 60_000;

export type LockoutState = {
  failedAttempts: number;
  lockedUntil: Date | null;
};

export function isLocked(state: LockoutState, now: Date): boolean {
  return state.lockedUntil !== null && state.lockedUntil.getTime() > now.getTime();
}

export function nextFailureState(state: LockoutState, now: Date): LockoutState {
  const windowExpired = state.lockedUntil !== null && state.lockedUntil.getTime() <= now.getTime();
  const previousAttempts = windowExpired ? 0 : state.failedAttempts;
  const failedAttempts = previousAttempts + 1;

  if (failedAttempts >= MAX_ATTEMPTS) {
    return {
      failedAttempts,
      lockedUntil: new Date(now.getTime() + LOCK_WINDOW_MS),
    };
  }

  return { failedAttempts, lockedUntil: null };
}
