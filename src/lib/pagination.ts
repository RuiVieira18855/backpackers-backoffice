/**
 * Tiny helpers for server-side pagination shared across list pages.
 *
 * URL contract:
 *   ?page=N (1-indexed). Optional ?perPage=N to override the default page size.
 *
 * Use `parsePagination(searchParams, defaultPageSize)` in your page, pass
 * `limit` + `offset` to the query, then count total rows and feed the
 * results into <Pagination />.
 */

export type PaginationParams = {
  /** 1-indexed, clamped to >= 1. */
  page: number;
  /** Effective page size after clamping. */
  pageSize: number;
  /** Drizzle .limit() value. */
  limit: number;
  /** Drizzle .offset() value. */
  offset: number;
};

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 200;

export function parsePagination(
  sp: Record<string, string | string[] | undefined>,
  fallbackPageSize: number = DEFAULT_PAGE_SIZE,
): PaginationParams {
  const rawPage = Array.isArray(sp.page) ? sp.page[0] : sp.page;
  const rawPerPage = Array.isArray(sp.perPage) ? sp.perPage[0] : sp.perPage;

  let page = Number.parseInt(rawPage ?? "1", 10);
  if (!Number.isFinite(page) || page < 1) page = 1;

  let pageSize = rawPerPage
    ? Number.parseInt(rawPerPage, 10)
    : fallbackPageSize;
  if (!Number.isFinite(pageSize) || pageSize < 1) pageSize = fallbackPageSize;
  if (pageSize > MAX_PAGE_SIZE) pageSize = MAX_PAGE_SIZE;

  return {
    page,
    pageSize,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  };
}

export function totalPagesFrom(total: number, pageSize: number): number {
  if (total <= 0) return 1;
  return Math.max(1, Math.ceil(total / pageSize));
}

/**
 * Build a URL preserving current search params and updating page= to the
 * given value. Strips perPage if it equals the default.
 */
export function pageHref(
  basePath: string,
  sp: Record<string, string | string[] | undefined>,
  page: number,
): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k === "page") continue;
    if (v === undefined) continue;
    if (Array.isArray(v)) {
      for (const item of v) params.append(k, item);
    } else {
      params.set(k, v);
    }
  }
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
