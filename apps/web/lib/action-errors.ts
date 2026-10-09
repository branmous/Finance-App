import { validationError } from "@finance-app/core";

/**
 * Failures shared by every server action, as translatable codes. The text lives in
 * messages/<locale>.json under "validation", so actions never carry display strings.
 */
export const SESSION_EXPIRED = validationError("sessionExpired");
