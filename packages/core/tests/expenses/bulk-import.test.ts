import { describe, expect, it } from "vitest";

import {
  BULK_IMPORT_MAX_BYTES,
  BULK_IMPORT_MAX_ROWS,
  buildTemplateCsv,
  validateBulkImport,
} from "../../src/expenses/bulk-import";

const categories = [
  { id: "3f1c2b7e-1a2b-4c3d-8e9f-0a1b2c3d4e5f", name: "Rent" },
  { id: "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d", name: "Netflix" },
  { id: "11111111-2222-4333-8444-555555555555", name: "Café, market" },
];
const [rent, netflix, market] = categories as [
  (typeof categories)[number],
  (typeof categories)[number],
  (typeof categories)[number],
];

const run = (text: string, period = "2026-06") => validateBulkImport({ text, period, categories });

describe("buildTemplateCsv", () => {
  it("starts with a BOM and the fixed header, then one empty row per category", () => {
    const csv = buildTemplateCsv([{ name: "Rent" }, { name: "Netflix" }]);
    expect(csv).toBe("﻿category,amount,paidOn,note\r\nRent,,,\r\nNetflix,,,\r\n");
  });

  it("quotes names with commas, quotes and accents stay intact", () => {
    const csv = buildTemplateCsv([{ name: "Café, market" }, { name: 'The "big" one' }]);
    expect(csv).toContain('"Café, market",,,');
    expect(csv).toContain('"The ""big"" one",,,');
  });

  it("returns only the header when there are no categories", () => {
    expect(buildTemplateCsv([])).toBe("﻿category,amount,paidOn,note\r\n");
  });

  it("round-trips through the validator as a file with no rows", () => {
    expect(run(buildTemplateCsv(categories))).toEqual({
      ok: false,
      errors: [{ line: 0, column: null, error: { code: "csvNoRows" } }],
    });
  });
});

describe("validateBulkImport", () => {
  it("builds independent expenses from valid rows", () => {
    const result = run(
      "category,amount,paidOn,note\nRent,1800000,2026-06-01,June rent\nNetflix,45900,,  \n",
    );
    expect(result).toEqual({
      ok: true,
      rows: [
        { line: 2, categoryId: rent.id, amountMinor: 1800000, paidOn: "2026-06-01", note: "June rent" },
        { line: 3, categoryId: netflix.id, amountMinor: 45900, paidOn: null, note: "" },
      ],
      total: 1845900,
      ignored: 0,
    });
  });

  it("never carries a parent link", () => {
    const result = run("category,amount,paidOn,note\nRent,100,,");
    expect(result.ok && result.rows.every((row) => !("parentId" in row))).toBe(true);
  });

  it.each(["1500000", "1.500.000", "1,500,000", "$1.500.000", "$ 1,500,000", " 1500000 "])(
    "reads the amount %s as 1500000",
    (amount) => {
      const result = run(`category,amount,paidOn,note\nRent,"${amount}",,`);
      expect(result).toMatchObject({ ok: true, rows: [{ amountMinor: 1500000 }] });
    },
  );

  it("ignores rows without an amount and counts them", () => {
    const result = run("category,amount,paidOn,note\nRent,,,\nNetflix,100,,\n,,,\nMarket,,2026-06-01,x");
    expect(result).toMatchObject({ ok: true, rows: [{ categoryId: netflix.id }], ignored: 3 });
  });

  it("keeps several rows of the same category", () => {
    const result = run("category,amount,paidOn,note\nRent,100,,\nRent,200,,");
    expect(result).toMatchObject({ ok: true, total: 300, rows: [{ categoryId: rent.id }, { categoryId: rent.id }] });
  });

  it("matches the category name ignoring case and surrounding spaces", () => {
    const result = run('category,amount,paidOn,note\n  nETFLIX ,100,,\n"café, MARKET",50,,');
    expect(result).toMatchObject({ ok: true, rows: [{ categoryId: netflix.id }, { categoryId: market.id }] });
  });

  it("accepts any column order, a semicolon separator and header case", () => {
    const result = run("Note;PaidOn;AMOUNT;Category\nhello;2026-06-05;100;Rent");
    expect(result).toMatchObject({
      ok: true,
      rows: [{ categoryId: rent.id, amountMinor: 100, paidOn: "2026-06-05", note: "hello" }],
    });
  });

  it("allows paying in a different month than the one loaded", () => {
    expect(run("category,amount,paidOn,note\nRent,100,2026-07-03,")).toMatchObject({ ok: true });
  });

  it("accepts a file saved with a BOM and Windows line endings", () => {
    expect(run("﻿category,amount,paidOn,note\r\nRent,100,,\r\n")).toMatchObject({ ok: true });
  });
});

describe("validateBulkImport errors", () => {
  const header = "category,amount,paidOn,note\n";

  it("reports every problem with its line and column", () => {
    const result = run(
      `${header}Ghost,100,,\nRent,abc,,\nNetflix,100,2026-02-30,\nRent,100,,${"x".repeat(141)}\nRent,100,,`,
    );
    expect(result).toEqual({
      ok: false,
      errors: [
        { line: 2, column: "category", error: { code: "csvUnknownCategory", params: { name: "Ghost" } } },
        { line: 3, column: "amount", error: { code: "amountPositive" } },
        { line: 4, column: "paidOn", error: { code: "invalidPaymentDate" } },
        { line: 5, column: "note", error: { code: "noteTooLong", params: { max: 140 } } },
      ],
    });
  });

  it.each(["0", "-5", "15,50", "1.5", "1.500.5", "12a", "1e3", "٣"])("rejects the amount %s", (amount) => {
    const result = run(`${header}Rent,"${amount}",,`);
    expect(result).toEqual({
      ok: false,
      errors: [{ line: 2, column: "amount", error: { code: "amountPositive" } }],
    });
  });

  it("asks for a category when the row has an amount but no category", () => {
    expect(run(`${header},100,,`)).toEqual({
      ok: false,
      errors: [{ line: 2, column: "category", error: { code: "chooseCategory" } }],
    });
  });

  it.each(["parent", "parentId", "extra"])("rejects the unknown column %s", (column) => {
    expect(run(`category,amount,paidOn,note,${column}\nRent,100,,,x`)).toEqual({
      ok: false,
      errors: [{ line: 0, column: null, error: { code: "csvUnknownColumn", params: { column } } }],
    });
  });

  it("rejects a repeated column", () => {
    expect(run("category,amount,paidOn,note,amount\nRent,100,,,5")).toMatchObject({
      ok: false,
      errors: [{ error: { code: "csvUnknownColumn", params: { column: "amount" } } }],
    });
  });

  it("rejects a file that misses a required column", () => {
    expect(run("category,amount,note\nRent,100,")).toEqual({
      ok: false,
      errors: [{ line: 0, column: null, error: { code: "csvMissingColumn", params: { column: "paidOn" } } }],
    });
  });

  it("rejects an empty file", () => {
    expect(run("")).toEqual({ ok: false, errors: [{ line: 0, column: null, error: { code: "csvEmpty" } }] });
    expect(run("  \n ")).toEqual({ ok: false, errors: [{ line: 0, column: null, error: { code: "csvEmpty" } }] });
  });

  it("rejects a file with a header but no rows with an amount", () => {
    expect(run(header)).toEqual({ ok: false, errors: [{ line: 0, column: null, error: { code: "csvNoRows" } }] });
  });

  it("rejects a row with the wrong number of fields", () => {
    expect(run(`${header}Rent,100\nNetflix,100,,`)).toEqual({
      ok: false,
      errors: [{ line: 2, column: null, error: { code: "csvBadFormat" } }],
    });
  });

  it("rejects unclosed quotes", () => {
    expect(run(`${header}"Rent,100,,`)).toEqual({
      ok: false,
      errors: [{ line: 0, column: null, error: { code: "csvBadFormat" } }],
    });
  });

  it("rejects more rows than the limit", () => {
    const rows = Array.from({ length: BULK_IMPORT_MAX_ROWS + 1 }, () => "Rent,1,,").join("\n");
    expect(run(`${header}${rows}`)).toEqual({
      ok: false,
      errors: [{ line: 0, column: null, error: { code: "csvTooManyRows", params: { max: BULK_IMPORT_MAX_ROWS } } }],
    });
  });

  it("accepts exactly the row limit", () => {
    const rows = Array.from({ length: BULK_IMPORT_MAX_ROWS }, () => "Rent,1,,").join("\n");
    expect(run(`${header}${rows}`)).toMatchObject({ ok: true, total: BULK_IMPORT_MAX_ROWS });
  });

  it("rejects a file bigger than the byte limit", () => {
    const text = `${header}Rent,1,,${"x".repeat(BULK_IMPORT_MAX_BYTES)}`;
    expect(run(text)).toEqual({
      ok: false,
      errors: [{ line: 0, column: null, error: { code: "csvTooLarge", params: { maxMb: 1 } } }],
    });
  });

  it("rejects an invalid month", () => {
    expect(run(`${header}Rent,100,,`, "2026-13")).toEqual({
      ok: false,
      errors: [{ line: 0, column: null, error: { code: "invalidMonth" } }],
    });
  });
});
