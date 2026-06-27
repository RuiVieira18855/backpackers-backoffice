import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { pageHref, totalPagesFrom } from "@/lib/pagination";
import { Button } from "@/components/ui/button";

type Props = {
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
  page: number;
  pageSize: number;
  total: number;
};

/**
 * Server component — renders Prev / page indicator / Next.
 *
 * Hides itself when there's only one page (or no results). Disables Prev on
 * page 1 and Next on the last page by rendering a non-link span.
 */
export async function Pagination({
  basePath,
  searchParams,
  page,
  pageSize,
  total,
}: Props) {
  const totalPages = totalPagesFrom(total, pageSize);
  if (totalPages <= 1) return null;

  const t = await getTranslations("pagination");

  const prevHref = pageHref(basePath, searchParams, page - 1);
  const nextHref = pageHref(basePath, searchParams, page + 1);

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <p className="text-xs text-muted-foreground">
        {t("range", { start, end, total })}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Button asChild variant="outline" size="sm">
            <Link href={prevHref}>
              <ChevronLeft className="mr-1 h-3.5 w-3.5" />
              {t("prev")}
            </Link>
          </Button>
        ) : (
          <span className="inline-flex h-8 items-center rounded-md border border-border px-3 text-sm text-muted-foreground opacity-50">
            <ChevronLeft className="mr-1 h-3.5 w-3.5" />
            {t("prev")}
          </span>
        )}
        <span className="text-xs text-muted-foreground tabular-nums px-2">
          {t("pageOf", { page, total: totalPages })}
        </span>
        {page < totalPages ? (
          <Button asChild variant="outline" size="sm">
            <Link href={nextHref}>
              {t("next")}
              <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        ) : (
          <span className="inline-flex h-8 items-center rounded-md border border-border px-3 text-sm text-muted-foreground opacity-50">
            {t("next")}
            <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </span>
        )}
      </div>
    </div>
  );
}
