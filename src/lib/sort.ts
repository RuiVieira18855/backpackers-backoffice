import { asc, desc, type SQL } from "drizzle-orm";

export type SortDir = "asc" | "desc";

/**
 * Toggle sort URL helper for clickable table headers.
 * - Click new column → sort that column asc (or desc for date-ish)
 * - Click same column → toggle dir
 *
 * Returns a query string suffix like "?sort=fullName&dir=asc" preserving
 * existing params (passed as `existing`).
 */
export function buildSortHref(
  basePath: string,
  existing: Record<string, string | undefined>,
  column: string,
  defaultDir: SortDir = "asc",
): string {
  const next: Record<string, string> = {};
  for (const [k, v] of Object.entries(existing)) {
    if (k === "sort" || k === "dir") continue;
    if (v) next[k] = v;
  }
  if (existing.sort === column) {
    next.sort = column;
    next.dir = existing.dir === "asc" ? "desc" : "asc";
  } else {
    next.sort = column;
    next.dir = defaultDir;
  }
  const qs = new URLSearchParams(next).toString();
  return `${basePath}?${qs}`;
}

/**
 * Convert sort params to a Drizzle order expression.
 * Pass a map of column-key → table column, plus the active sort.
 */
export function resolveSort<TCol>(
  map: Record<string, TCol>,
  sort: string | undefined,
  dir: string | undefined,
  fallback: SQL | TCol,
): SQL | TCol {
  if (!sort || !map[sort]) return fallback;
  const col = map[sort] as unknown as Parameters<typeof asc>[0];
  return dir === "asc" ? asc(col) : desc(col);
}
