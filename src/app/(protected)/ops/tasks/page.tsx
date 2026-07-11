import Link from "next/link";
import { CheckSquare, LayoutGrid, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { and, asc, eq, sql, type SQL } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { getAllPillars, requireProfile } from "@/lib/dal";
import { Pagination } from "@/components/pagination";
import { parsePagination } from "@/lib/pagination";

type SearchParams = Promise<{
  pillar?: string;
  status?: string;
  priority?: string;
  mine?: string;
  page?: string;
  perPage?: string;
}>;

const STATUSES = ["todo", "doing", "blocked", "done"] as const;
const PRIORITIES = ["low", "normal", "high", "urgent"] as const;

export default async function TasksListPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const t = await getTranslations("ops.tasks");
  const tStatuses = await getTranslations("ops.taskStatuses");
  const tPriorities = await getTranslations("ops.taskPriorities");
  const tCommon = await getTranslations("common");
  const profile = await requireProfile();

  const sp = await searchParams;
  const mine = sp.mine === "1";
  const allPillars = await getAllPillars();
  const pillarBySlug = sp.pillar
    ? allPillars.find((p) => p.slug === sp.pillar)
    : null;

  const filters: (SQL | undefined)[] = [
    mine ? eq(tasks.assigneeId, profile.id) : undefined,
    pillarBySlug ? eq(tasks.pillarId, pillarBySlug.id) : undefined,
    sp.status && (STATUSES as readonly string[]).includes(sp.status)
      ? eq(tasks.status, sp.status as (typeof STATUSES)[number])
      : undefined,
    sp.priority && (PRIORITIES as readonly string[]).includes(sp.priority)
      ? eq(tasks.priority, sp.priority as (typeof PRIORITIES)[number])
      : undefined,
  ];
  const where = filters.some(Boolean) ? and(...filters) : undefined;
  const hasActiveFilters = Boolean(sp.pillar || sp.status || sp.priority);

  const pagination = parsePagination(sp, 25);

  const [rows, totalRows] = await Promise.all([
    db.query.tasks.findMany({
      with: { pillar: true, assignee: true, project: true, event: true },
      where,
      orderBy: [asc(tasks.dueDate), asc(tasks.createdAt)],
      limit: pagination.limit,
      offset: pagination.offset,
    }),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(tasks)
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
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/ops/tasks/kanban">
              <LayoutGrid className="mr-2 h-4 w-4" />
              {t("openKanban")}
            </Link>
          </Button>
          <Button asChild>
            <Link href="/ops/tasks/new">
              <Plus className="mr-2 h-4 w-4" />
              {t("newTask")}
            </Link>
          </Button>
        </div>
      </div>

      {/* Mine / All toggle */}
      <div className="flex gap-1 border-b border-border">
        <Link
          href="/ops/tasks"
          className={`px-3 py-2 text-sm border-b-2 ${
            !mine
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("allTasks")}
        </Link>
        <Link
          href="/ops/tasks?mine=1"
          className={`px-3 py-2 text-sm border-b-2 ${
            mine
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("myTasks")}
        </Link>
      </div>

      <form
        action="/ops/tasks"
        method="get"
        className="flex flex-wrap items-end gap-3 border-b border-border pb-4"
      >
        {mine && <input type="hidden" name="mine" value="1" />}

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
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs min-w-[140px]"
          >
            <option value="">{tCommon("all")}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {tStatuses(s)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground uppercase tracking-wider">
            {t("table.priority")}
          </label>
          <select
            name="priority"
            defaultValue={sp.priority ?? ""}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs min-w-[140px]"
          >
            <option value="">{tCommon("all")}</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {tPriorities(p)}
              </option>
            ))}
          </select>
        </div>

        <Button type="submit" size="sm">
          {tCommon("filter")}
        </Button>
        {hasActiveFilters && (
          <Button asChild variant="ghost" size="sm">
            <Link href={mine ? "/ops/tasks?mine=1" : "/ops/tasks"}>
              {tCommon("cancel")}
            </Link>
          </Button>
        )}
      </form>

      <p className="text-sm text-muted-foreground">
        {t("count", { count: totalRows })}
      </p>

      {rows.length === 0 ? (
        <EmptyState
          icon={<CheckSquare className="h-5 w-5" />}
          title={t("empty")}
          description={t("emptyDescription")}
          action={{ label: t("newTask"), href: "/ops/tasks/new" }}
          secondary={{
            label: t("openKanban"),
            href: "/ops/tasks/kanban",
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
                      {t("table.title")}
                    </th>
                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                      {t("table.status")}
                    </th>
                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                      {t("table.priority")}
                    </th>
                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                      {t("table.assignee")}
                    </th>
                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                      {t("table.dueDate")}
                    </th>
                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                      {t("table.linked")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-0">
                        <Link
                          href={`/ops/tasks/${row.id}`}
                          className="block px-0 py-3 font-medium text-foreground"
                        >
                          {row.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/ops/tasks/${row.id}`}
                          className="inline-flex items-center rounded-full bg-accent/40 px-2 py-0.5 text-xs text-foreground"
                        >
                          {tStatuses(row.status)}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <Link
                          href={`/ops/tasks/${row.id}`}
                          className="block py-3 -my-3"
                        >
                          {tPriorities(row.priority)}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <Link
                          href={`/ops/tasks/${row.id}`}
                          className="block py-3 -my-3"
                        >
                          {row.assignee?.fullName ?? row.assignee?.email ?? "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <Link
                          href={`/ops/tasks/${row.id}`}
                          className="block py-3 -my-3"
                        >
                          {row.dueDate ?? "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <Link
                          href={`/ops/tasks/${row.id}`}
                          className="block py-3 -my-3"
                        >
                          {row.project?.name ?? row.event?.name ?? "—"}
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

      <Pagination
        basePath="/ops/tasks"
        searchParams={sp}
        page={pagination.page}
        pageSize={pagination.pageSize}
        total={totalRows}
      />
    </div>
  );
}
