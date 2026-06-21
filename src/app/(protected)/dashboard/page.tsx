import Link from "next/link";
import {
  Calendar,
  ClipboardList,
  FileText,
  ListTodo,
  Users,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { sql, gte, and, ne, isNotNull, desc } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import {
  auditLog,
  contacts,
  documents,
  events,
  tasks,
} from "@/lib/db/schema";
import { getAllPillars, requireProfile } from "@/lib/dal";
import {
  contactsTrend,
  eventsTrend,
  tasksTrend,
  documentsTrend,
} from "@/lib/trends";
import { ActivityTrend } from "@/components/charts/activity-trend";

const ENTITY_LABEL: Record<string, string> = {
  contact: "Contacto",
  event: "Evento",
  project: "Projecto",
  task: "Tarefa",
  document: "Documento",
  profile: "Perfil",
};

const ACTION_LABEL: Record<string, string> = {
  create: "criou",
  update: "actualizou",
  delete: "eliminou",
};

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const profile = await requireProfile();
  const pillars = await getAllPillars();
  const now = new Date();

  const [
    contactsCount,
    leadCount,
    upcomingEventsCount,
    openTasksCount,
    myOpenTasksCount,
    docsCount,
    recentAudit,
    nextEvents,
    myTasks,
    contactsT,
    eventsT,
    tasksT,
    documentsT,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(contacts),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(contacts)
      .where(sql`${contacts.stage} IN ('new','qualified','active')`),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(events)
      .where(and(isNotNull(events.startAt), gte(events.startAt, now))),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(tasks)
      .where(ne(tasks.status, "done")),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(tasks)
      .where(
        sql`${tasks.assigneeId} = ${profile.id} AND ${tasks.status} != 'done'`,
      ),
    db.select({ count: sql<number>`count(*)::int` }).from(documents),
    db.query.auditLog.findMany({
      orderBy: [desc(auditLog.createdAt)],
      limit: 8,
      with: { user: true, pillar: true },
    }),
    db.query.events.findMany({
      where: and(isNotNull(events.startAt), gte(events.startAt, now)),
      orderBy: (e, { asc }) => [asc(e.startAt)],
      with: { pillar: true },
      limit: 4,
    }),
    db.query.tasks.findMany({
      where: sql`${tasks.assigneeId} = ${profile.id} AND ${tasks.status} != 'done'`,
      orderBy: (tk, { asc }) => [asc(tk.dueDate), asc(tk.createdAt)],
      with: { pillar: true, project: true, event: true },
      limit: 5,
    }),
    contactsTrend(30),
    eventsTrend(30),
    tasksTrend(30),
    documentsTrend(30),
  ]);

  const kpis = [
    {
      key: "contacts" as const,
      icon: Users,
      value: contactsCount[0]?.count ?? 0,
      hint: t("kpis.leadsActive", { count: leadCount[0]?.count ?? 0 }),
      href: "/crm",
      trend: contactsT,
      color: "#A8E6E2",
    },
    {
      key: "events" as const,
      icon: Calendar,
      value: upcomingEventsCount[0]?.count ?? 0,
      hint: t("kpis.upcomingEvents"),
      href: "/ops/events",
      trend: eventsT,
      color: "#0E2A44",
    },
    {
      key: "tasks" as const,
      icon: ListTodo,
      value: openTasksCount[0]?.count ?? 0,
      hint: t("kpis.openTasks"),
      href: "/ops/tasks",
      trend: tasksT,
      color: "#A8E6E2",
    },
    {
      key: "documents" as const,
      icon: FileText,
      value: docsCount[0]?.count ?? 0,
      hint: t("kpis.documentsHint"),
      href: "/docs",
      trend: documentsT,
      color: "#0E2A44",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-10 py-10 space-y-10">
      <div>
        <p className="text-sm text-muted-foreground">
          {t("hello", { name: profile.fullName || profile.email })}
        </p>
        <h1 className="font-display text-5xl sm:text-6xl text-foreground leading-none mt-1">
          {t("title")}
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          {t(`greetings.${profile.role}` as never)}
        </p>
      </div>

      <section className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Link key={k.key} href={k.href} className="group">
              <Card className="h-full transition-colors group-hover:border-accent">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardDescription className="uppercase text-xs tracking-wider">
                      {t(`kpis.${k.key}` as never)}
                    </CardDescription>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="font-display text-4xl text-foreground">
                    {k.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{k.hint}</p>
                  <div className="mt-3">
                    <ActivityTrend
                      data={k.trend}
                      color={k.color}
                      label={k.key}
                    />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t("nextEvents")}</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardDescription>{t("nextEventsHint")}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {nextEvents.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground italic">
                {t("nextEventsEmpty")}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {nextEvents.map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`/ops/events/${e.id}`}
                      className="flex items-center justify-between px-6 py-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          {e.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {e.pillar?.name ?? ""}
                          {e.location ? ` · ${e.location}` : ""}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground shrink-0">
                        {e.startAt
                          ? new Intl.DateTimeFormat("pt-PT", {
                              dateStyle: "short",
                              timeStyle: "short",
                            }).format(e.startAt)
                          : "—"}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {t("myTasks", { count: myOpenTasksCount[0]?.count ?? 0 })}
              </CardTitle>
              <ListTodo className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardDescription>{t("myTasksHint")}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {myTasks.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground italic">
                {t("myTasksEmpty")}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {myTasks.map((tk) => (
                  <li key={tk.id}>
                    <Link
                      href={`/ops/tasks/${tk.id}`}
                      className="flex items-center justify-between px-6 py-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          {tk.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {tk.pillar?.name ?? ""}
                          {tk.project ? ` · ${tk.project.name}` : ""}
                          {tk.event ? ` · ${tk.event.name}` : ""}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground shrink-0">
                        {tk.dueDate ?? "—"}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm uppercase tracking-wider text-muted-foreground">
          {t("recentActivity")}
        </h2>
        {recentAudit.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              {t("recentActivityEmpty")}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {recentAudit.map((entry) => (
                  <li key={entry.id} className="px-6 py-3 text-sm">
                    <div className="flex flex-wrap items-baseline gap-x-1 gap-y-1">
                      <span className="font-medium text-foreground">
                        {entry.user?.fullName ?? entry.user?.email ?? "—"}
                      </span>
                      <span className="text-muted-foreground">
                        {ACTION_LABEL[entry.action] ?? entry.action}
                      </span>
                      <span className="text-foreground">
                        {ENTITY_LABEL[entry.entityType] ?? entry.entityType}
                      </span>
                      {entry.pillar && (
                        <span className="text-xs text-muted-foreground">
                          · {entry.pillar.name}
                        </span>
                      )}
                      <span className="ml-auto text-xs text-muted-foreground">
                        {new Intl.DateTimeFormat("pt-PT", {
                          dateStyle: "short",
                          timeStyle: "short",
                        }).format(entry.createdAt)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-sm uppercase tracking-wider text-muted-foreground">
          {t("sectionPillars")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((pilar) => (
            <Card key={pilar.id}>
              <CardHeader>
                <CardTitle className="font-display text-xl tracking-wide">
                  {pilar.name}
                </CardTitle>
                <CardDescription className="text-xs uppercase tracking-wider">
                  {pilar.slug}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {pilar.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
