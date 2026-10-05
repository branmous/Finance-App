import bcrypt from "bcryptjs";

const COST_FACTOR = 12;

let dummyHashPromise: Promise<string> | undefined;

function getDummyHash(): Promise<string> {
  dummyHashPromise ??= bcrypt.hash("dummy-password-for-timing", COST_FACTOR);
  return dummyHashPromise;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST_FACTOR);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Runs a full bcrypt comparison even when no user exists, so the response
 * time does not reveal whether an identifier is registered.
 */
export async function verifyAgainstDummyHash(password: string): Promise<void> {
  await bcrypt.compare(password, await getDummyHash());
}
