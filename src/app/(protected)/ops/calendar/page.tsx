import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { and, gte, lte, isNotNull, ne } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { events, tasks } from "@/lib/db/schema";
import { requireProfile } from "@/lib/dal";

type SearchParams = Promise<{ range?: "30" | "60" | "90" }>;

type AgendaItem =
  | {
      kind: "event";
      id: string;
      title: string;
      pillarName: string | null;
      date: Date;
      meta: string;
    }
  | {
      kind: "task";
      id: string;
      title: string;
      pillarName: string | null;
      date: Date;
      meta: string;
      done: boolean;
    };

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function fmtDateHeading(d: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

function fmtTime(d: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { timeStyle: "short" }).format(d);
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const t = await getTranslations("ops.calendar");
  const tCommon = await getTranslations("common");
  const tStatuses = await getTranslations("ops.taskStatuses");
  await requireProfile();

  const sp = await searchParams;
  const daysAhead = Number(sp.range ?? "30");

  const start = startOfDay(new Date());
  const end = new Date(start);
  end.setDate(end.getDate() + daysAhead);

  // Fetch events with start_at in range
  const eventsRows = await db.query.events.findMany({
    with: { pillar: true },
    where: and(
      isNotNull(events.startAt),
      gte(events.startAt, start),
      lte(events.startAt, end),
    ),
    orderBy: (e, { asc }) => [asc(e.startAt)],
  });

  // Fetch tasks with due_date in range, exclude 'done'
  // due_date is a DATE column → values come back as ISO strings (YYYY-MM-DD)
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);
  const tasksRows = await db.query.tasks.findMany({
    with: { pillar: true },
    where: and(
      isNotNull(tasks.dueDate),
      gte(tasks.dueDate, startStr),
      lte(tasks.dueDate, endStr),
      ne(tasks.status, "done"),
    ),
    orderBy: (tk, { asc }) => [asc(tk.dueDate)],
  });

  const items: AgendaItem[] = [
    ...eventsRows
      .filter((e) => e.startAt !== null)
      .map<AgendaItem>((e) => ({
        kind: "event",
        id: e.id,
        title: e.name,
        pillarName: e.pillar?.name ?? null,
        date: e.startAt as Date,
        meta: `${fmtTime(e.startAt as Date, "pt-PT")}${e.location ? ` · ${e.location}` : ""}`,
      })),
    ...tasksRows.map<AgendaItem>((tk) => ({
      kind: "task",
      id: tk.id,
      title: tk.title,
      pillarName: tk.pillar?.name ?? null,
      // Parse "YYYY-MM-DD" as local date (avoid TZ surprise)
      date: (() => {
        const [y, m, d] = (tk.dueDate as string).split("-").map(Number);
        return new Date(y, m - 1, d);
      })(),
      meta: tStatuses(tk.status as never),
      done: tk.status === "done",
    })),
  ];

  // Sort all by date
  items.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Group by date string (YYYY-MM-DD)
  const groups = new Map<string, AgendaItem[]>();
  for (const item of items) {
    const key = item.date.toISOString().slice(0, 10);
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }

  const groupedDates = Array.from(groups.entries()).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-10 py-10 space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
          <Link href="/ops">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("backToOps")}
          </Link>
        </Button>
        <h1 className="font-display text-6xl text-foreground leading-none">
          {t("title")}
        </h1>
        <p className="mt-2 text-base text-muted-foreground">{t("subtitle")}</p>
      </div>

      <form
        action="/ops/calendar"
        method="get"
        className="flex items-end gap-3 border-y border-border py-4"
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground uppercase tracking-wider">
            {t("rangeLabel")}
          </label>
          <select
            name="range"
            defaultValue={String(daysAhead)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs min-w-[140px]"
          >
            <option value="30">{t("range30")}</option>
            <option value="60">{t("range60")}</option>
            <option value="90">{t("range90")}</option>
          </select>
        </div>
        <Button type="submit" size="sm">
          {tCommon("filter")}
        </Button>
      </form>

      {groupedDates.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">{t("empty")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedDates.map(([dateKey, dayItems]) => {
            const dateObj = (() => {
              const [y, m, d] = dateKey.split("-").map(Number);
              return new Date(y, m - 1, d);
            })();
            return (
              <section key={dateKey} className="space-y-2">
                <h2 className="text-sm uppercase tracking-wider text-muted-foreground capitalize">
                  {fmtDateHeading(dateObj, "pt-PT")}
                </h2>
                <Card>
                  <CardContent className="p-0">
                    <ul className="divide-y divide-border">
                      {dayItems.map((item) => (
                        <li key={`${item.kind}-${item.id}`}>
                          <Link
                            href={
                              item.kind === "event"
                                ? `/ops/events/${item.id}`
                                : `/ops/tasks/${item.id}`
                            }
                            className="flex items-center justify-between gap-4 px-6 py-3 hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                                  item.kind === "event"
                                    ? "bg-accent/40 text-foreground"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {t(item.kind === "event" ? "event" : "task")}
                              </span>
                              <span className="font-medium text-foreground truncate">
                                {item.title}
                              </span>
                              {item.pillarName && (
                                <span className="text-xs text-muted-foreground hidden sm:inline">
                                  · {item.pillarName}
                                </span>
                              )}
                            </div>
                            <span className="text-sm text-muted-foreground shrink-0">
                              {item.meta}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
