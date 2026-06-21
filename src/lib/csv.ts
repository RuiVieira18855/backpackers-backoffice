/**
 * Convert rows to CSV string. Handles escaping for commas, quotes, newlines.
 * RFC 4180 compliant.
 */
type Cell = string | number | boolean | null | undefined | Date;

function escapeCell(value: Cell): string {
  if (value === null || value === undefined) return "";
  let str: string;
  if (value instanceof Date) {
    str = value.toISOString();
  } else {
    str = String(value);
  }
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function rowsToCsv(headers: string[], rows: Cell[][]): string {
  const lines = [
    headers.map(escapeCell).join(","),
    ...rows.map((r) => r.map(escapeCell).join(",")),
  ];
  // Excel-friendly: BOM + CRLF
  return "﻿" + lines.join("\r\n");
}

export function csvResponse(filename: string, csv: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
