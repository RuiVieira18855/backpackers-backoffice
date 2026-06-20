import Link from "next/link";
import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { and, desc, eq, type SQL } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { getAllPillars, requireProfile } from "@/lib/dal";

type SearchParams = Promise<{ pillar?: string; status?: string }>;

const STATUSES = ["planned", "active", "on_hold", "completed", "cancelled"] as const;

export default async function ProjectsListPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const t = await getTranslations("ops.projects");
  const tStatuses = await getTranslations("ops.projectStatuses");
  const tCommon = await getTranslations("common");
  await requireProfile();

  const sp = await searchParams;
  const allPillars = await getAllPillars();
  const pillarBySlug = sp.pillar
    ? allPillars.find((p) => p.slug === sp.pillar)
    : null;

  const filters: (SQL | undefined)[] = [
    pillarBySlug ? eq(projects.pillarId, pillarBySlug.id) : undefined,
    sp.status && (STATUSES as readonly string[]).includes(sp.status)
      ? eq(projects.status, sp.status as (typeof STATUSES)[number])
      : undefined,
  ];
  const where = filters.some(Boolean) ? and(...filters) : undefined;
  const hasActiveFilters = Boolean(sp.pillar || sp.status);

  const rows = await db.query.projects.findMany({
    with: { pillar: true, clientContact: true },
    where,
    orderBy: [desc(projects.createdAt)],
    limit: 200,
  });

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-10 py-10 space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-6xl text-foreground leading-none">
            {t("title")}
          </h1>
          <p className="mt-2 text-base text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button asChild>
          <Link href="/ops/projects/new">
            <Plus className="mr-2 h-4 w-4" />
            {t("newProject")}
          </Link>
        </Button>
      </div>

      <form
        action="/ops/projects"
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
            {t("table.status")}
          </label>
          <select
            name="status"
            defaultValue={sp.status ?? ""}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs min-w-[160px]"
          >
            <option value="">{tCommon("all")}</option>
            {STATUSES.map((st) => (
              <option key={st} value={st}>
                {tStatuses(st)}
              </option>
            ))}
          </select>
        </div>

        <Button type="submit" size="sm">
          {tCommon("filter")}
        </Button>
        {hasActiveFilters && (
          <Button asChild variant="ghost" size="sm">
            <Link href="/ops/projects">{tCommon("cancel")}</Link>
          </Button>
        )}
      </form>

      <p className="text-sm text-muted-foreground">
        {t("count", { count: rows.length })}
      </p>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">{t("empty")}</p>
            <Button asChild className="mt-6">
              <Link href="/ops/projects/new">
                <Plus className="mr-2 h-4 w-4" />
                {t("newProject")}
              </Link>
            </Button>
          </CardContent>
        </Card>
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
                      {t("table.status")}
                    </th>
                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                      {t("table.pillar")}
                    </th>
                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                      {t("table.targetDate")}
                    </th>
                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                      {t("table.client")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-0">
                        <Link
                          href={`/ops/projects/${p.id}`}
                          className="block px-0 py-3 font-medium text-foreground"
                        >
                          {p.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/ops/projects/${p.id}`}
                          className="inline-flex items-center rounded-full bg-accent/40 px-2 py-0.5 text-xs text-foreground"
                        >
                          {tStatuses(p.status)}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <Link
                          href={`/ops/projects/${p.id}`}
                          className="block py-3 -my-3"
                        >
                          {p.pillar?.name ?? "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <Link
                          href={`/ops/projects/${p.id}`}
                          className="block py-3 -my-3"
                        >
                          {p.targetDate ?? "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <Link
                          href={`/ops/projects/${p.id}`}
                          className="block py-3 -my-3"
                        >
                          {p.clientContact?.fullName ?? "—"}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
