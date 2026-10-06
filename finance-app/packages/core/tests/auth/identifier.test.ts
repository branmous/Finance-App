import { describe, expect, it } from "vitest";

import { normalizeIdentifier } from "../../src/auth/identifier";

describe("normalizeIdentifier", () => {
  it("trims surrounding whitespace", () => {
    expect(normalizeIdentifier("  brand  ")).toBe("brand");
  });

  it("lowercases emails", () => {
    expect(normalizeIdentifier("  Brand@Example.COM ")).toBe("brand@example.com");
  });

  it("lowercases usernames so 'Brand' and 'brand' are the same account", () => {
    expect(normalizeIdentifier("Brand_01")).toBe("brand_01");
  });
});
