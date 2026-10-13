import { validationError, type ValidationError } from "../validation";
import { parseCsv } from "./csv";
import { validateExpenseInput } from "./expense";
import { isValidPeriod } from "./period";

export const BULK_IMPORT_MAX_ROWS = 500;
export const BULK_IMPORT_MAX_BYTES = 1_048_576;
export const BULK_IMPORT_COLUMNS = ["category", "amount", "paidOn", "note"] as const;

export type BulkImportColumn = (typeof BULK_IMPORT_COLUMNS)[number];

/** A row of the file that becomes one independent expense (it never has a parent). */
export type BulkImportRow = {
  /** Line of the file where the row is (1 = header). */
  line: number;
  categoryId: string;
  /** Whole pesos. */
  amountMinor: number;
  paidOn: string | null;
  note: string;
};

export type BulkImportError = {
  /** Line of the file, or 0 when the problem is with the file as a whole. */
  line: number;
  column: BulkImportColumn | null;
  error: ValidationError;
};

export type BulkImportResult =
  | { ok: true; rows: BulkImportRow[]; total: number; ignored: number }
  | { ok: false; errors: BulkImportError[] };

export type BulkImportCategory = { id: string; name: string };

const fileError = (error: ValidationError): BulkImportResult => ({
  ok: false,
  errors: [{ line: 0, column: null, error }],
});

const BOM = String.fromCharCode(0xfeff);

/** Size of the text once encoded as UTF-8 (core has no DOM/Node types, so no TextEncoder). */
function utf8ByteLength(text: string): number {
  let bytes = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
  }
  return bytes;
}

function escapeField(value: string): string {
  return /[",;\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** The CSV the user fills in: BOM so Excel reads accents, one empty row per category. */
export function buildTemplateCsv(categories: ReadonlyArray<{ name: string }>): string {
  const lines = [BULK_IMPORT_COLUMNS.join(","), ...categories.map((category) => `${escapeField(category.name)},,,`)];
  return `${BOM}${lines.join("\r\n")}\r\n`;
}

// Plain digits, or digits grouped in thousands with "." or ","; anything else (decimals included) is invalid.
const AMOUNT_PATTERN = /^(\d+|\d{1,3}([.,]\d{3})+)$/;

function parseAmount(raw: string): number {
  const cleaned = raw.replace(/[$\s]/g, "");
  if (!AMOUNT_PATTERN.test(cleaned)) return Number.NaN;
  return Number(cleaned.replace(/[.,]/g, ""));
}

const normalizeName = (name: string) => name.trim().toLowerCase();

/**
 * Validates a whole file before anything is saved: every problem is reported with its line and column,
 * and the rows are only returned when there are none. Rows without an amount are ignored, which is
 * how the untouched template rows are skipped.
 */
export function validateBulkImport(input: {
  text: string;
  period: string;
  categories: ReadonlyArray<BulkImportCategory>;
}): BulkImportResult {
  const { text, period, categories } = input;

  if (!isValidPeriod(period)) return fileError(validationError("invalidMonth"));
  if (utf8ByteLength(text) > BULK_IMPORT_MAX_BYTES) {
    return fileError(validationError("csvTooLarge", { maxMb: BULK_IMPORT_MAX_BYTES / 1_048_576 }));
  }
  if (text.trim() === "") return fileError(validationError("csvEmpty"));

  const parsed = parseCsv(text);
  if (!parsed.ok) return fileError(parsed.error);
  const [headerRecord, ...records] = parsed.records;
  if (!headerRecord) return fileError(validationError("csvEmpty"));

  // The header must be exactly the four known columns, so a file can never carry a parent link.
  const columnIndex = new Map<BulkImportColumn, number>();
  const headerErrors: BulkImportError[] = [];
  headerRecord.fields.forEach((raw, index) => {
    const name = raw.trim();
    const known = BULK_IMPORT_COLUMNS.find((column) => column.toLowerCase() === name.toLowerCase());
    if (known && !columnIndex.has(known)) columnIndex.set(known, index);
    else headerErrors.push({ line: 0, column: null, error: validationError("csvUnknownColumn", { column: name }) });
  });
  for (const column of BULK_IMPORT_COLUMNS) {
    if (!columnIndex.has(column)) {
      headerErrors.push({ line: 0, column: null, error: validationError("csvMissingColumn", { column }) });
    }
  }
  if (headerErrors.length > 0) return { ok: false, errors: headerErrors };

  const categoryIds = new Map(categories.map((category) => [normalizeName(category.name), category.id]));
  // Lets an unknown category still be checked for its other fields without a real id.
  const placeholderId = "00000000-0000-4000-8000-000000000000";

  const rows: BulkImportRow[] = [];
  const errors: BulkImportError[] = [];
  let ignored = 0;

  for (const record of records) {
    if (record.fields.length !== headerRecord.fields.length) {
      errors.push({ line: record.line, column: null, error: validationError("csvBadFormat") });
      continue;
    }
    const cell = (column: BulkImportColumn) => (record.fields[columnIndex.get(column) ?? -1] ?? "").trim();

    if (cell("amount") === "") {
      ignored++;
      continue;
    }

    const categoryName = cell("category");
    const knownId = categoryIds.get(normalizeName(categoryName));
    const rowErrors: BulkImportError[] = [];
    const fail = (column: BulkImportColumn, error: ValidationError) =>
      rowErrors.push({ line: record.line, column, error });

    if (categoryName !== "" && !knownId) {
      fail("category", validationError("csvUnknownCategory", { name: categoryName }));
    }

    const validated = validateExpenseInput({
      categoryId: categoryName === "" ? "" : (knownId ?? placeholderId),
      amountMinor: parseAmount(cell("amount")),
      period,
      paidOn: cell("paidOn"),
      note: cell("note"),
      parentId: null,
    });
    if (!validated.ok) {
      const { categoryId, amountMinor, paidOn, note } = validated.errors;
      if (categoryId) fail("category", categoryId);
      if (amountMinor) fail("amount", amountMinor);
      if (paidOn) fail("paidOn", paidOn);
      if (note) fail("note", note);
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
    } else if (validated.ok) {
      rows.push({
        line: record.line,
        categoryId: validated.value.categoryId,
        amountMinor: validated.value.amountMinor,
        paidOn: validated.value.paidOn,
        note: validated.value.note,
      });
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  if (rows.length === 0) return fileError(validationError("csvNoRows"));
  if (rows.length > BULK_IMPORT_MAX_ROWS) {
    return fileError(validationError("csvTooManyRows", { max: BULK_IMPORT_MAX_ROWS }));
  }

  return { ok: true, rows, total: rows.reduce((sum, row) => sum + row.amountMinor, 0), ignored };
}
