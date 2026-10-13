import { describe, expect, it } from "vitest";

import { parseCsv } from "../../src/expenses/csv";

describe("parseCsv", () => {
  it("parses comma separated rows with their line numbers", () => {
    expect(parseCsv("a,b\n1,2\n3,4")).toEqual({
      ok: true,
      records: [
        { line: 1, fields: ["a", "b"] },
        { line: 2, fields: ["1", "2"] },
        { line: 3, fields: ["3", "4"] },
      ],
    });
  });

  it("detects a semicolon separator from the header line", () => {
    expect(parseCsv("a;b\n1;2")).toMatchObject({ ok: true, records: [{ fields: ["a", "b"] }, { fields: ["1", "2"] }] });
  });

  it("keeps commas that live inside quotes when the separator is a semicolon", () => {
    expect(parseCsv('a;b\n"1,5";2')).toMatchObject({ ok: true, records: [{}, { fields: ["1,5", "2"] }] });
  });

  it("ignores a leading BOM", () => {
    expect(parseCsv("﻿a,b\n1,2")).toMatchObject({ ok: true, records: [{ fields: ["a", "b"] }, {}] });
  });

  it("accepts Windows line endings", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual({
      ok: true,
      records: [
        { line: 1, fields: ["a", "b"] },
        { line: 2, fields: ["1", "2"] },
      ],
    });
  });

  it("reads quoted fields with separators, escaped quotes and line breaks", () => {
    const result = parseCsv('a,b\n"x, y","say ""hi"""\n"two\nlines",z\nlast,row');
    expect(result).toEqual({
      ok: true,
      records: [
        { line: 1, fields: ["a", "b"] },
        { line: 2, fields: ["x, y", 'say "hi"'] },
        { line: 3, fields: ["two\nlines", "z"] },
        { line: 5, fields: ["last", "row"] },
      ],
    });
  });

  it("skips blank lines but keeps rows that only have separators", () => {
    const result = parseCsv("a,b\n\n,\n1,2\n");
    expect(result).toEqual({
      ok: true,
      records: [
        { line: 1, fields: ["a", "b"] },
        { line: 3, fields: ["", ""] },
        { line: 4, fields: ["1", "2"] },
      ],
    });
  });

  it("keeps empty trailing fields", () => {
    expect(parseCsv("a,b,c\nx,,")).toMatchObject({ ok: true, records: [{}, { fields: ["x", "", ""] }] });
  });

  it("fails when a quote is never closed", () => {
    expect(parseCsv('a,b\n"open,1')).toEqual({ ok: false, error: { code: "csvBadFormat" } });
  });

  it("returns no records for empty text", () => {
    expect(parseCsv("")).toEqual({ ok: true, records: [] });
  });
});
