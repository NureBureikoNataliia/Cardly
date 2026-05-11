import * as XLSX from "xlsx";

export const IMPORT_MAX_PAIRS = 2000;
const MAX_CELL = 6000;

export type ImportWordRow = {
  front: string;
  back: string;
  notes?: string;
};

/** Strip BOM and unify newlines */
function normalizeText(raw: string): string {
  return raw.replace(/^\ufeff/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function clip(s: string): string {
  const t = s.trim();
  if (t.length <= MAX_CELL) return t;
  return t.slice(0, MAX_CELL);
}

const FRONT_RE = /^(front|term|question|word|слова?|термін|перед|лице|інозем)$/i;
const BACK_RE = /^(back|answer|definition|translation|переклад|відповідь|зад|україн)$/i;
const NOTES_RE = /^(notes|note|comment|коментар|примітк)/i;

function detectColumnIndices(header: string[]): {
  fi: number;
  bi: number;
  ni: number | null;
  usedHeader: boolean;
} | null {
  const lower = header.map((c) => c.trim().toLowerCase());
  let fi = lower.findIndex((c) => FRONT_RE.test(c));
  let bi = lower.findIndex((c) => BACK_RE.test(c));
  let ni = lower.findIndex((c) => NOTES_RE.test(c));
  if (fi >= 0 && bi >= 0) {
    return { fi, bi, ni: ni >= 0 ? ni : null, usedHeader: true };
  }
  return null;
}

/** Parse one CSV line with quoted fields; delimiter `,` or `;` from first line heuristic. */
function parseCsvLine(line: string, delimiter: "," | ";"): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === delimiter) {
        out.push(cur);
        cur = "";
      } else {
        cur += c;
      }
    }
  }
  out.push(cur);
  return out.map((s) => clip(s.replace(/^"|"$/g, "")));
}

function guessCsvDelimiter(firstLine: string): "," | ";" {
  const commas = (firstLine.match(/,/g) ?? []).length;
  const semis = (firstLine.match(/;/g) ?? []).length;
  return semis > commas ? ";" : ",";
}

function parseCsvToMatrix(text: string): string[][] {
  const t = normalizeText(text);
  const lines = t.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const delim = guessCsvDelimiter(lines[0]);
  return lines.map((line) => parseCsvLine(line, delim));
}

function parseTxtToMatrix(text: string): string[][] {
  const t = normalizeText(text);
  const lines = t.split("\n");
  const rows: string[][] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.includes("\t")) {
      rows.push(trimmed.split("\t").map(clip));
    } else if (trimmed.includes("|")) {
      rows.push(trimmed.split("|").map(clip));
    } else {
      const m = trimmed.match(/^(.+?)\s{2,}(.+)$/);
      if (m) {
        rows.push([clip(m[1]), clip(m[2])]);
      }
    }
  }
  return rows;
}

function matrixToPairs(matrix: string[][]): ImportWordRow[] {
  if (matrix.length === 0) return [];

  let startRow = 0;
  let fi = 0;
  let bi = 1;
  let ni: number | null = null;

  const head = matrix[0].map((c) => clip(c));
  const detected = detectColumnIndices(head);
  if (detected) {
    startRow = 1;
    fi = detected.fi;
    bi = detected.bi;
    ni = detected.ni;
  } else if (head.length >= 2) {
    fi = 0;
    bi = 1;
    ni = head.length > 2 ? 2 : null;
  } else {
    return [];
  }

  const out: ImportWordRow[] = [];
  for (let r = startRow; r < matrix.length; r++) {
    const row = matrix[r];
    if (!row || row.length <= Math.max(fi, bi)) continue;
    const front = clip(row[fi] ?? "");
    const back = clip(row[bi] ?? "");
    if (!front && !back) continue;
    if (!front || !back) continue;
    const notes = ni != null && row[ni] != null ? clip(row[ni]) : undefined;
    out.push(notes ? { front, back, notes } : { front, back });
    if (out.length >= IMPORT_MAX_PAIRS) break;
  }
  return out;
}

export function parseImportFromCsvText(text: string): ImportWordRow[] {
  return matrixToPairs(parseCsvToMatrix(text));
}

export function parseImportFromTxtText(text: string): ImportWordRow[] {
  return matrixToPairs(parseTxtToMatrix(text));
}

export function parseImportFromXlsxArrayBuffer(buf: ArrayBuffer): ImportWordRow[] {
  const wb = XLSX.read(buf, { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const sheet = wb.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    raw: false,
    defval: "",
  }) as string[][];
  const norm = matrix.map((row) => (row ?? []).map((c) => clip(String(c ?? ""))));
  return matrixToPairs(norm);
}

export function extensionFromName(name: string): "csv" | "txt" | "xlsx" | null {
  const n = name.toLowerCase();
  if (n.endsWith(".csv")) return "csv";
  if (n.endsWith(".txt")) return "txt";
  if (n.endsWith(".xlsx")) return "xlsx";
  if (n.endsWith(".xls")) return "xlsx";
  return null;
}

/** When the filename has no extension (e.g. some web uploads), infer from MIME. */
export function inferImportKind(
  filename: string,
  mime?: string | null
): "csv" | "txt" | "xlsx" | null {
  const fromName = extensionFromName(filename);
  if (fromName) return fromName;
  const m = (mime ?? "").toLowerCase();
  if (m.includes("csv") || m === "application/csv") return "csv";
  if (m === "text/plain") return "txt";
  if (
    m.includes("spreadsheet") ||
    m.includes("excel") ||
    m === "application/vnd.ms-excel" ||
    m === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    return "xlsx";
  }
  return null;
}
