import Link from "next/link";
import { LayoutGrid, Plus, Target } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { db } from "@/lib/db";
import { deals } from "@/lib/db/schema";
import { getAllPillars, requireProfile } from "@/lib/dal";
import { Pagination } from "@/components/pagination";
import { parsePagination } from "@/lib/pagination";

type SearchParams = Promise<{
  pillar?: string;
  stage?: string;
  page?: string;
  perPage?: string;
}>;

const STAGES = ["lead", "qualified", "proposal", "negotiation", "won", "lost"] as const;

export default async function DealsListPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireProfile();
  const t = await getTranslations("deals");
  const tStages = await getTranslations("deals.stages");
  const tCommon = await getTranslations("common");
  const sp = await searchParams;
  const allPillars = await getAllPillars();
  const pillarBySlug = sp.pillar
    ? allPillars.find((p) => p.slug === sp.pillar)
    : null;

  const filters: (SQL | undefined)[] = [
    pillarBySlug ? eq(deals.pillarId, pillarBySlug.id) : undefined,
    sp.stage && (STAGES as readonly string[]).includes(sp.stage)
      ? eq(deals.stage, sp.stage as (typeof STAGES)[number])
      : undefined,
  ];
  const where = filters.some(Boolean) ? and(...filters) : undefined;
  const hasActiveFilters = Boolean(sp.pillar || sp.stage);

  const pagination = parsePagination(sp, 25);

  const [rows, totalRows, pillarMap] = await Promise.all([
    db
      .select()
      .from(deals)
      .where(where ?? sql`true`)
      .orderBy(desc(deals.updatedAt))
      .limit(pagination.limit)
      .offset(pagination.offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(deals)
      .where(where ?? sql`true`)
      .then((r) => r[0]?.count ?? 0),
    Promise.resolve(new Map(allPillars.map((p) => [p.id, p]))),
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
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/crm/deals/pipeline">
              <LayoutGrid className="mr-2 h-4 w-4" />
              {t("pipeline")}
            </Link>
          </Button>
          <Button asChild>
            <Link href="/crm/deals/new">
              <Plus className="mr-2 h-4 w-4" />
              {t("newDeal")}
            </Link>
          </Button>
        </div>
      </div>

      <form
        action="/crm/deals"
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
            {t("table.stage")}
          </label>
          <select
            name="stage"
            defaultValue={sp.stage ?? ""}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs min-w-[160px]"
          >
            <option value="">{tCommon("all")}</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {tStages(s)}
              </option>
            ))}
          </select>
        </div>

        <Button type="submit" size="sm">
          {tCommon("filter")}
        </Button>
        {hasActiveFilters && (
          <Button asChild variant="ghost" size="sm">
            <Link href="/crm/deals">{tCommon("cancel")}</Link>
          </Button>
        )}
      </form>

      <p className="text-sm text-muted-foreground">
        {t("count", { count: totalRows })}
      </p>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Target className="h-5 w-5" />}
          title={t("empty")}
          description={t("emptyDescription")}
          action={{ label: t("newDeal"), href: "/crm/deals/new" }}
          secondary={{
            label: t("openPipeline"),
            href: "/crm/deals/pipeline",
          }}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/30">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                      {t("table.name")}
                    </th>
                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                      {t("table.stage")}
                    </th>
                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                      {t("table.pillar")}
                    </th>
                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground text-right">
                      {t("table.value")}
                    </th>
                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                      {t("table.close")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((d) => (
                    <tr
                      key={d.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/crm/deals/${d.id}`}
                          className="font-medium text-foreground hover:underline"
                        >
                          {d.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-accent/40 px-2 py-0.5 text-xs text-foreground">
                          {tStages(d.stage)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {pillarMap.get(d.pillarId)?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">
                        {d.value
                          ? new Intl.NumberFormat("pt-PT", {
                              style: "currency",
                              currency: d.currency,
                              maximumFractionDigits: 0,
                            }).format(Number(d.value))
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {d.expectedCloseDate ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Pagination
        basePath="/crm/deals"
        searchParams={sp}
        page={pagination.page}
        pageSize={pagination.pageSize}
        total={totalRows}
      />
    </div>
  );
}
