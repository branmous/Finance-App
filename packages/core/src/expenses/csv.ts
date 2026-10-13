import { validationError, type ValidationError } from "../validation";

export type CsvRecord = {
  /** Line of the file where the record starts (1 = first line). */
  line: number;
  fields: string[];
};

export type CsvParseResult = { ok: true; records: CsvRecord[] } | { ok: false; error: ValidationError };

const BOM = 0xfeff;

/** Excel in Spanish locales saves with ";", so the header line decides between "," and ";". */
function detectDelimiter(text: string): "," | ";" {
  let commas = 0;
  let semicolons = 0;
  let inQuotes = false;
  for (const ch of text) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes) {
      if (ch === "\n") break;
      if (ch === ",") commas++;
      else if (ch === ";") semicolons++;
    }
  }
  return semicolons > commas ? ";" : ",";
}

/**
 * Parses CSV text (RFC 4180 quoting, optional BOM, CRLF or LF). Blank lines are skipped; a record
 * that only has separators is kept so the caller can decide to ignore it.
 */
export function parseCsv(input: string): CsvParseResult {
  const text = input.charCodeAt(0) === BOM ? input.slice(1) : input;
  const delimiter = detectDelimiter(text);
  const records: CsvRecord[] = [];

  let fields: string[] = [];
  let field = "";
  let inQuotes = false;
  let line = 1;
  let startLine = 1;

  function endRecord() {
    fields.push(field);
    const blank = fields.length === 1 && fields[0] === "";
    if (!blank) records.push({ line: startLine, fields });
    fields = [];
    field = "";
  }

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        if (ch === "\n") line++;
        field += ch;
      }
      continue;
    }
    if (ch === '"' && field === "") {
      inQuotes = true;
    } else if (ch === delimiter) {
      fields.push(field);
      field = "";
    } else if (ch === "\n") {
      endRecord();
      line++;
      startLine = line;
    } else if (ch !== "\r") {
      field += ch;
    }
  }

  if (inQuotes) return { ok: false, error: validationError("csvBadFormat") };
  endRecord();
  return { ok: true, records };
}
