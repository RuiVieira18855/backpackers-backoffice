import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { getAllPillars, requireProfile } from "@/lib/dal";
import { Pagination } from "@/components/pagination";
import { parsePagination } from "@/lib/pagination";

type SearchParams = Promise<{
  pillar?: string;
  type?: string;
  page?: string;
  perPage?: string;
}>;

const TYPES = ["procedure", "contract", "report", "portfolio", "other"] as const;

function formatBytes(bytes: number | null): string {
  if (bytes === null) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export default async function DocsListPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const t = await getTranslations("docs");
  const tTypes = await getTranslations("docs.types");
  const tCommon = await getTranslations("common");
  await requireProfile();

  const sp = await searchParams;
  const allPillars = await getAllPillars();
  const pillarBySlug = sp.pillar
    ? allPillars.find((p) => p.slug === sp.pillar)
    : null;

  const filters: (SQL | undefined)[] = [
    pillarBySlug ? eq(documents.pillarId, pillarBySlug.id) : undefined,
    sp.type && (TYPES as readonly string[]).includes(sp.type)
      ? eq(documents.type, sp.type as (typeof TYPES)[number])
      : undefined,
  ];
  const where = filters.some(Boolean) ? and(...filters) : undefined;
  const hasActiveFilters = Boolean(sp.pillar || sp.type);

  const pagination = parsePagination(sp, 25);

  const [rows, totalRows] = await Promise.all([
    db.query.documents.findMany({
      with: { pillar: true, uploadedByProfile: true },
      where,
      orderBy: [desc(documents.createdAt)],
      limit: pagination.limit,
      offset: pagination.offset,
    }),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(documents)
      .where(where ?? sql`true`)
      .then((r) => r[0]?.count ?? 0),
  ]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl sm:text-6xl text-foreground leading-none">
            {t("title")}
          </h1>
          <p className="mt-2 text-base text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button asChild>
          <Link href="/docs/new">
            <Plus className="mr-2 h-4 w-4" />
            {t("newDoc")}
          </Link>
        </Button>
      </div>

      <form
        action="/docs"
        method="get"
        className="flex flex-wrap items-end gap-3 border-y border-border py-4"
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground uppercase tracking-wider">
            {t("table.pillar")}
          </label>
          <select
            name="pillar"
            defaultValue={sp.pillar ?? ""}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs min-w-[160px]"
          >
            <option value="">{tCommon("all")}</option>
            {allPillars.map((p) => (
              <option key={p.id} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground uppercase tracking-wider">
            {t("table.type")}
          </label>
          <select
            name="type"
            defaultValue={sp.type ?? ""}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs min-w-[140px]"
          >
            <option value="">{tCommon("all")}</option>
            {TYPES.map((tp) => (
              <option key={tp} value={tp}>
                {tTypes(tp)}
              </option>
            ))}
          </select>
        </div>

        <Button type="submit" size="sm">
          {tCommon("filter")}
        </Button>
        {hasActiveFilters && (
          <Button asChild variant="ghost" size="sm">
            <Link href="/docs">{tCommon("cancel")}</Link>
          </Button>
        )}
      </form>

      <p className="text-sm text-muted-foreground">
        {t("count", { count: totalRows })}
      </p>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">{t("empty")}</p>
            <Button asChild className="mt-6">
              <Link href="/docs/new">
                <Plus className="mr-2 h-4 w-4" />
                {t("newDoc")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {rows.map((d) => (
            <li key={d.id}>
              <Link
                href={`/docs/${d.id}`}
                className="block bg-card border border-border rounded-md p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <FileText className="h-8 w-8 text-muted-foreground shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {d.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {d.fileName} · {formatBytes(d.fileSize)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="inline-flex items-center rounded-full bg-accent/40 px-2 py-0.5 text-xs text-foreground">
                        {tTypes(d.type)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {d.pillar?.name ?? ""}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Pagination
        basePath="/docs"
        searchParams={sp}
        page={pagination.page}
        pageSize={pagination.pageSize}
        total={totalRows}
      />
    </div>
  );
}
