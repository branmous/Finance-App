import { describe, expect, it } from "vitest";

import { LOCALES, isLocale, matchAcceptLanguage } from "../../i18n/config";
import { catalogs } from "../../messages";

type Tree = { [key: string]: string | Tree };

/** "categories.types.fixed.label" → "Fixed expenses" for every leaf of the catalog. */
function flatten(tree: Tree, prefix = ""): Map<string, string> {
  const result = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") result.set(path, value);
    else for (const [childPath, text] of flatten(value, path)) result.set(childPath, text);
  }
  return result;
}

/** Placeholders and rich-text tags a message uses, e.g. "{max}" or "<strong>", sorted for comparison. */
function tokens(text: string): string[] {
  const placeholders = [...text.matchAll(/\{\s*(\w+)\s*[,}]/g)].map((match) => `{${match[1]}}`);
  const tags = [...text.matchAll(/<(\w+)>/g)].map((match) => `<${match[1]}>`);
  return [...new Set([...placeholders, ...tags])].sort();
}

const en = flatten(catalogs.en as Tree);
const es = flatten(catalogs.es as Tree);

describe("message catalogs", () => {
  it("define exactly the same keys in English and Spanish", () => {
    const missingInEs = [...en.keys()].filter((key) => !es.has(key));
    const missingInEn = [...es.keys()].filter((key) => !en.has(key));
    expect({ missingInEs, missingInEn }).toEqual({ missingInEs: [], missingInEn: [] });
  });

  it("use the same placeholders and tags in both languages", () => {
    const mismatched = [...en.entries()]
      .filter(([key, text]) => es.has(key) && tokens(text).join() !== tokens(es.get(key)!).join())
      .map(([key]) => key);
    expect(mismatched).toEqual([]);
  });

  it("have no empty messages", () => {
    const empty = [...en, ...es].filter(([, text]) => text.trim() === "").map(([key]) => key);
    expect(empty).toEqual([]);
  });

  it("only support English and Spanish", () => {
    expect([...LOCALES]).toEqual(["en", "es"]);
    expect(Object.keys(catalogs).sort()).toEqual(["en", "es"]);
  });
});

describe("locale detection", () => {
  it("accepts only supported languages", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("es")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });

  it("picks the first supported language of Accept-Language", () => {
    expect(matchAcceptLanguage("es-CO,es;q=0.9,en;q=0.8")).toBe("es");
    expect(matchAcceptLanguage("fr-FR,fr;q=0.9,en;q=0.8")).toBe("en");
    expect(matchAcceptLanguage("fr-FR,de;q=0.9")).toBeNull();
    expect(matchAcceptLanguage(null)).toBeNull();
  });
});
