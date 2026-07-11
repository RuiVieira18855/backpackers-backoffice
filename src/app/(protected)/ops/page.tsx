import Link from "next/link";
import { Calendar, CalendarDays, ClipboardList, ListTodo } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { sql, gte, eq } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { events, projects, tasks } from "@/lib/db/schema";
import { requireProfile } from "@/lib/dal";

export default async function OpsPage() {
  const t = await getTranslations("ops");
  const profile = await requireProfile();

  const [eventsTotal, projectsTotal, tasksTotal, myOpenTasks] =
    await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(events),
      db.select({ count: sql<number>`count(*)::int` }).from(projects),
      db.select({ count: sql<number>`count(*)::int` }).from(tasks),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(tasks)
        .where(
          sql`${tasks.assigneeId} = ${profile.id} AND ${tasks.status} != 'done'`,
        ),
    ]);

  const today = new Date();
  const upcoming = await db.query.events.findMany({
    where: gte(events.startAt, today),
    with: { pillar: true },
    orderBy: (e, { asc }) => [asc(e.startAt)],
    limit: 5,
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl sm:text-6xl text-foreground leading-none">
            {t("title")}
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/ops/calendar">
            <CalendarDays className="mr-2 h-4 w-4" />
            {t("openCalendar")}
          </Link>
        </Button>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-2xl tracking-wide">
                {t("cards.events")}
              </CardTitle>
              <Calendar className="h-5 w-5 text-accent-foreground" />
            </div>
            <CardDescription>{t("cards.eventsDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-3xl font-display text-foreground">
              {eventsTotal[0]?.count ?? 0}
            </p>
            <Button asChild variant="ghost" size="sm" className="-ml-3">
              <Link href="/ops/events">{t("cards.open")} →</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-2xl tracking-wide">
                {t("cards.projects")}
              </CardTitle>
              <ClipboardList className="h-5 w-5 text-accent-foreground" />
            </div>
            <CardDescription>{t("cards.projectsDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-3xl font-display text-foreground">
              {projectsTotal[0]?.count ?? 0}
            </p>
            <Button asChild variant="ghost" size="sm" className="-ml-3">
              <Link href="/ops/projects">{t("cards.open")} →</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-2xl tracking-wide">
                {t("cards.tasks")}
              </CardTitle>
              <ListTodo className="h-5 w-5 text-accent-foreground" />
            </div>
            <CardDescription>{t("cards.tasksDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-3xl font-display text-foreground">
              {tasksTotal[0]?.count ?? 0}
            </p>
            <div className="flex gap-3">
              <Button asChild variant="ghost" size="sm" className="-ml-3">
                <Link href="/ops/tasks">{t("cards.open")} →</Link>
              </Button>
              {(myOpenTasks[0]?.count ?? 0) > 0 && (
                <Button asChild variant="ghost" size="sm">
                  <Link href="/ops/tasks?mine=1">
                    {t("cards.myOpen", { count: myOpenTasks[0]?.count ?? 0 })}
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm uppercase tracking-wider text-muted-foreground">
          {t("upcomingEvents")}
        </h2>
        {upcoming.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">{t("noUpcoming")}</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {upcoming.map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`/ops/events/${e.id}`}
                      className="flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors"
                    >
                      <div>
                        <div className="font-medium text-foreground">
                          {e.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {e.pillar?.name}
                          {e.location ? ` · ${e.location}` : ""}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {e.startAt
                          ? new Intl.DateTimeFormat("pt-PT", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            }).format(e.startAt)
                          : "—"}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
