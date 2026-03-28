export type CsvParseResult = {
  headers: string[];
  rows: string[][];
};

// RFC4180-ish CSV parser (supports quotes, escaped quotes, CRLF).
export function parseCsv(text: string): CsvParseResult {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let i = 0;
  let inQuotes = false;

  const pushCell = () => {
    row.push(cell);
    cell = "";
  };
  const pushRow = () => {
    // Skip trailing empty row
    if (row.length === 1 && row[0] === "" && rows.length === 0) {
      // allow blank header row to be handled by caller
    }
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        const next = text[i + 1];
        if (next === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      cell += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }

    if (ch === ",") {
      pushCell();
      i += 1;
      continue;
    }

    if (ch === "\n") {
      pushCell();
      pushRow();
      i += 1;
      continue;
    }

    if (ch === "\r") {
      // handle CRLF
      const next = text[i + 1];
      if (next === "\n") {
        pushCell();
        pushRow();
        i += 2;
      } else {
        pushCell();
        pushRow();
        i += 1;
      }
      continue;
    }

    cell += ch;
    i += 1;
  }

  pushCell();
  if (row.length > 1 || row[0] !== "" || rows.length > 0) pushRow();

  const headerRow = rows[0] ?? [];
  const headers = headerRow.map((h) => h.trim());
  const dataRows = rows.slice(1);

  return { headers, rows: dataRows };
}

function escapeCell(value: string) {
  if (value.includes('"') || value.includes(",") || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]) {
  const out: string[] = [];
  out.push(headers.map((h) => escapeCell(String(h))).join(","));
  for (const r of rows) {
    out.push(r.map((v) => escapeCell(v === null || v === undefined ? "" : String(v))).join(","));
  }
  return out.join("\n") + "\n";
}

