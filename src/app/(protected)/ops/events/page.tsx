import Link from "next/link";
import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { getAllPillars, requireProfile } from "@/lib/dal";
import { Pagination } from "@/components/pagination";
import { parsePagination } from "@/lib/pagination";

type SearchParams = Promise<{
  pillar?: string;
  status?: string;
  type?: string;
  page?: string;
  perPage?: string;
}>;

const STATUSES = ["draft", "scheduled", "in_progress", "completed", "cancelled"] as const;
const TYPES = ["tour", "team_building", "workshop", "meeting", "retreat", "other"] as const;

function fmtDateTime(d: Date | null, locale: string): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export default async function EventsListPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const t = await getTranslations("ops");
  const tStatuses = await getTranslations("ops.eventStatuses");
  const tTypes = await getTranslations("ops.eventTypes");
  const tCommon = await getTranslations("common");
  await requireProfile();

  const sp = await searchParams;
  const allPillars = await getAllPillars();
  const pillarBySlug = sp.pillar
    ? allPillars.find((p) => p.slug === sp.pillar)
    : null;

  const filters: (SQL | undefined)[] = [
    pillarBySlug ? eq(events.pillarId, pillarBySlug.id) : undefined,
    sp.status && (STATUSES as readonly string[]).includes(sp.status)
      ? eq(events.status, sp.status as (typeof STATUSES)[number])
      : undefined,
    sp.type && (TYPES as readonly string[]).includes(sp.type)
      ? eq(events.type, sp.type as (typeof TYPES)[number])
      : undefined,
  ];
  const where = filters.some(Boolean) ? and(...filters) : undefined;
  const hasActiveFilters = Boolean(sp.pillar || sp.status || sp.type);

  const pagination = parsePagination(sp, 25);

  const [rows, totalRows] = await Promise.all([
    db.query.events.findMany({
      with: { pillar: true, clientContact: true },
      where,
      orderBy: [desc(events.startAt), desc(events.createdAt)],
      limit: pagination.limit,
      offset: pagination.offset,
    }),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(events)
      .where(where ?? sql`true`)
      .then((r) => r[0]?.count ?? 0),
  ]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl sm:text-6xl text-foreground leading-none">
            {t("eventsTitle")}
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            {t("eventsSubtitle")}
          </p>
        </div>
        <Button asChild>
          <Link href="/ops/events/new">
            <Plus className="mr-2 h-4 w-4" />
            {t("newEvent")}
          </Link>
        </Button>
      </div>

      <form
        action="/ops/events"
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
            <Link href="/ops/events">{tCommon("cancel")}</Link>
          </Button>
        )}
      </form>

      <p className="text-sm text-muted-foreground">
        {t("eventsCount", { count: totalRows })}
      </p>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">{t("eventsEmpty")}</p>
            <Button asChild className="mt-6">
              <Link href="/ops/events/new">
                <Plus className="mr-2 h-4 w-4" />
                {t("newEvent")}
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
                      {t("table.type")}
                    </th>
                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                      {t("table.status")}
                    </th>
                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                      {t("table.pillar")}
                    </th>
                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                      {t("table.startAt")}
                    </th>
                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                      {t("table.client")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((e) => (
                    <tr
                      key={e.id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-0">
                        <Link
                          href={`/ops/events/${e.id}`}
                          className="block px-0 py-3"
                        >
                          <div className="font-medium text-foreground">
                            {e.name}
                          </div>
                          {e.location && (
                            <div className="text-xs text-muted-foreground">
                              {e.location}
                            </div>
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <Link
                          href={`/ops/events/${e.id}`}
                          className="block py-3 -my-3"
                        >
                          {tTypes(e.type)}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/ops/events/${e.id}`}
                          className="inline-flex items-center rounded-full bg-accent/40 px-2 py-0.5 text-xs text-foreground"
                        >
                          {tStatuses(e.status)}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <Link
                          href={`/ops/events/${e.id}`}
                          className="block py-3 -my-3"
                        >
                          {e.pillar?.name ?? "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <Link
                          href={`/ops/events/${e.id}`}
                          className="block py-3 -my-3"
                        >
                          {fmtDateTime(e.startAt, "pt-PT")}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <Link
                          href={`/ops/events/${e.id}`}
                          className="block py-3 -my-3"
                        >
                          {e.clientContact?.fullName ?? "—"}
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
        basePath="/ops/events"
        searchParams={sp}
        page={pagination.page}
        pageSize={pagination.pageSize}
        total={totalRows}
      />
    </div>
  );
}
