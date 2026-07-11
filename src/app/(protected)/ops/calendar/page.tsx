import Link from "next/link";
import { ChevronLeft, ChevronRight, List, LayoutGrid } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { and, gte, lte, isNotNull, ne } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { events, tasks } from "@/lib/db/schema";
import { requireProfile } from "@/lib/dal";
import { cn } from "@/lib/utils";

type SearchParams = Promise<{
  view?: "agenda" | "grid";
  range?: "30" | "60" | "90";
  month?: string;
}>;

type AgendaItem = {
  kind: "event" | "task";
  id: string;
  title: string;
  pillarName: string | null;
  date: Date;
  meta: string;
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

function parseMonth(s: string | undefined): { year: number; month: number } {
  if (s && /^\d{4}-\d{2}$/.test(s)) {
    const [y, m] = s.split("-").map(Number);
    return { year: y, month: m - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

function monthLabel(year: number, month: number, locale: string): string {
  const d = new Date(year, month, 1);
  const s = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function addMonths(year: number, month: number, delta: number): string {
  const d = new Date(year, month + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
  const view = sp.view === "grid" ? "grid" : "agenda";

  let start: Date;
  let end: Date;

  if (view === "grid") {
    const { year, month } = parseMonth(sp.month);
    start = new Date(year, month, 1);
    end = new Date(year, month + 1, 0);
    end.setHours(23, 59, 59, 999);
  } else {
    const daysAhead = Number(sp.range ?? "30");
    start = startOfDay(new Date());
    end = new Date(start);
    end.setDate(end.getDate() + daysAhead);
  }

  const eventsRows = await db.query.events.findMany({
    with: { pillar: true },
    where: and(
      isNotNull(events.startAt),
      gte(events.startAt, start),
      lte(events.startAt, end),
    ),
    orderBy: (e, { asc }) => [asc(e.startAt)],
  });

  const startStr = isoDay(start);
  const endStr = isoDay(end);
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
      date: (() => {
        const [y, m, d] = (tk.dueDate as string).split("-").map(Number);
        return new Date(y, m - 1, d);
      })(),
      meta: tStatuses(tk.status as never),
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
          <Link href="/ops">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("backToOps")}
          </Link>
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-4xl sm:text-6xl text-foreground leading-none">
              {t("title")}
            </h1>
            <p className="mt-2 text-base text-muted-foreground">
              {t("subtitle")}
            </p>
          </div>

          <div className="inline-flex rounded-md border border-border p-1 bg-card">
            <Link
              href={`/ops/calendar?view=agenda${sp.range ? `&range=${sp.range}` : ""}`}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 text-sm rounded-sm",
                view === "agenda"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <List className="h-3.5 w-3.5" />
              {t("viewAgenda")}
            </Link>
            <Link
              href={`/ops/calendar?view=grid${sp.month ? `&month=${sp.month}` : ""}`}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 text-sm rounded-sm",
                view === "grid"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              {t("viewGrid")}
            </Link>
          </div>
        </div>
      </div>

      {view === "agenda" ? (
        <AgendaView items={items} sp={sp} t={t} tCommon={tCommon} />
      ) : (
        <GridView items={items} sp={sp} t={t} />
      )}
    </div>
  );
}

function AgendaView({
  items,
  sp,
  t,
  tCommon,
}: {
  items: AgendaItem[];
  sp: { range?: "30" | "60" | "90" };
  t: (k: string) => string;
  tCommon: (k: string) => string;
}) {
  const daysAhead = Number(sp.range ?? "30");
  const groups = new Map<string, AgendaItem[]>();
  for (const item of items) {
    const key = isoDay(item.date);
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  const groupedDates = Array.from(groups.entries()).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  return (
    <>
      <form
        action="/ops/calendar"
        method="get"
        className="flex items-end gap-3 border-y border-border py-4"
      >
        <input type="hidden" name="view" value="agenda" />
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
            const [y, m, d] = dateKey.split("-").map(Number);
            const dateObj = new Date(y, m - 1, d);
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
                                className={cn(
                                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs",
                                  item.kind === "event"
                                    ? "bg-accent/40 text-foreground"
                                    : "bg-muted text-muted-foreground",
                                )}
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
    </>
  );
}

function GridView({
  items,
  sp,
  t,
}: {
  items: AgendaItem[];
  sp: { month?: string };
  t: (k: string) => string;
}) {
  const { year, month } = parseMonth(sp.month);
  const prevMonth = addMonths(year, month, -1);
  const nextMonth = addMonths(year, month, 1);
  const thisMonth = addMonths(year, month, 0);

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const firstDayWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();
  const totalCells = Math.ceil((firstDayWeekday + daysInMonth) / 7) * 7;

  const byDay = new Map<number, AgendaItem[]>();
  for (const it of items) {
    if (it.date.getFullYear() !== year || it.date.getMonth() !== month) continue;
    const day = it.date.getDate();
    const list = byDay.get(day) ?? [];
    list.push(it);
    byDay.set(day, list);
  }

  const cells: Array<{
    dayNumber: number | null;
    items: AgendaItem[];
    isToday: boolean;
  }> = [];

  const today = new Date();
  const todayKey =
    today.getFullYear() === year && today.getMonth() === month
      ? today.getDate()
      : -1;

  for (let i = 0; i < totalCells; i++) {
    const dayNumber = i - firstDayWeekday + 1;
    if (dayNumber < 1 || dayNumber > daysInMonth) {
      cells.push({ dayNumber: null, items: [], isToday: false });
    } else {
      cells.push({
        dayNumber,
        items: byDay.get(dayNumber) ?? [],
        isToday: dayNumber === todayKey,
      });
    }
  }

  const weekdayLabels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  return (
    <>
      <div className="flex items-center justify-between border-y border-border py-4">
        <h2 className="text-lg font-medium text-foreground capitalize">
          {monthLabel(year, month, "pt-PT")}
        </h2>
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/ops/calendar?view=grid&month=${prevMonth}`}>
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/ops/calendar?view=grid&month=${thisMonth}`}>
              {t("today")}
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/ops/calendar?view=grid&month=${nextMonth}`}>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-7 border-b border-border bg-muted/30">
            {weekdayLabels.map((wd) => (
              <div
                key={wd}
                className="px-2 py-2 text-xs uppercase tracking-wider text-muted-foreground text-center"
              >
                {wd}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((cell, idx) => (
              <div
                key={idx}
                className={cn(
                  "min-h-[100px] border-r border-b border-border p-1.5 last-of-type:border-r-0",
                  cell.dayNumber === null && "bg-muted/20",
                  cell.isToday && "bg-accent/10",
                )}
              >
                {cell.dayNumber !== null && (
                  <>
                    <div
                      className={cn(
                        "text-xs font-medium mb-1",
                        cell.isToday
                          ? "text-accent-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {cell.dayNumber}
                    </div>
                    <ul className="space-y-0.5">
                      {cell.items.slice(0, 3).map((it) => (
                        <li key={`${it.kind}-${it.id}`}>
                          <Link
                            href={
                              it.kind === "event"
                                ? `/ops/events/${it.id}`
                                : `/ops/tasks/${it.id}`
                            }
                            className={cn(
                              "block text-xs truncate rounded px-1 py-0.5 hover:opacity-80",
                              it.kind === "event"
                                ? "bg-accent/40 text-foreground"
                                : "bg-muted text-foreground",
                            )}
                            title={it.title}
                          >
                            {it.title}
                          </Link>
                        </li>
                      ))}
                      {cell.items.length > 3 && (
                        <li className="text-xs text-muted-foreground px-1">
                          + {cell.items.length - 3}
                        </li>
                      )}
                    </ul>
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
