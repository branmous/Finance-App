import { describe, expect, it } from "vitest";

import { isHttpUrl } from "../../src/categories/category";

describe("isHttpUrl", () => {
  it("accepts http and https URLs", () => {
    expect(isHttpUrl("https://bank.example/pay")).toBe(true);
    expect(isHttpUrl("http://bank.example")).toBe(true);
  });

  it("rejects other protocols and free text", () => {
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpUrl("Cuenta 123 Bancolombia")).toBe(false);
    expect(isHttpUrl("")).toBe(false);
  });
});
