/**
 * A validation failure as a stable code plus optional values to interpolate (e.g. `{ max: 40 }`).
 * The domain never produces display text: the UI translates the code into the user's language.
 */
export type ValidationError = {
  code: string;
  params?: Record<string, string | number>;
};

export function validationError(code: string, params?: ValidationError["params"]): ValidationError {
  return params ? { code, params } : { code };
}
