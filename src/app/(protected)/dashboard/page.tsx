import Link from "next/link";
import {
  Calendar,
  FileText,
  FilePlus,
  FolderPlus,
  ListTodo,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { sql, gte, and, ne, isNotNull, desc, eq, or } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import {
  auditLog,
  contacts,
  documents,
  events,
  tasks,
  transactions,
} from "@/lib/db/schema";
import {
  getAllPillars,
  hasSkill,
  requireProfile,
} from "@/lib/dal";
import {
  contactsTrend,
  eventsTrend,
  tasksTrend,
} from "@/lib/trends";
import { ActivityTrend } from "@/components/charts/activity-trend";

const ENTITY_LABEL: Record<string, string> = {
  contact: "Contacto",
  event: "Evento",
  project: "Projecto",
  task: "Tarefa",
  document: "Documento",
  profile: "Perfil",
  transaction: "Movimento",
};

const ACTION_LABEL: Record<string, string> = {
  create: "criou",
  update: "actualizou",
  delete: "eliminou",
};

const STAGES = ["new", "qualified", "active", "on_hold", "closed_won", "closed_lost"] as const;

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fmtEur(n: number, max = 0): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: max,
  }).format(n);
}

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const tStages = await getTranslations("crm.stages");
  const tTypes = await getTranslations("finance.types");
  const profile = await requireProfile();
  const pillars = await getAllPillars();

  const [hasCrm, hasOps, hasDocs, hasFinance, hasAdmin] = await Promise.all([
    hasSkill("crm"),
    hasSkill("ops"),
    hasSkill("docs"),
    hasSkill("finance"),
    hasSkill("admin"),
  ]);

  const now = new Date();
  const today = startOfDay(now);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  const [
    contactsCount,
    leadCount,
    upcomingEventsCount,
    openTasksCount,
    docsCount,
    recentAudit,
    weekEvents,
    weekTasks,
    contactsT,
    eventsT,
    tasksT,
    contactsByStage,
    recentDocs,
    mtdAgg,
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
    db.select({ count: sql<number>`count(*)::int` }).from(documents),
    db.query.auditLog.findMany({
      orderBy: [desc(auditLog.createdAt)],
      limit: 8,
      with: { user: true, pillar: true },
    }),
    db.query.events.findMany({
      where: and(
        isNotNull(events.startAt),
        gte(events.startAt, today),
        sql`${events.startAt} < ${weekEnd}`,
      ),
      orderBy: (e, { asc }) => [asc(e.startAt)],
      with: { pillar: true },
      limit: 20,
    }),
    db.query.tasks.findMany({
      where: and(
        ne(tasks.status, "done"),
        or(
          sql`${tasks.dueDate} IS NULL AND ${tasks.assigneeId} = ${profile.id}`,
          and(
            isNotNull(tasks.dueDate),
            sql`${tasks.dueDate} <= ${isoDay(weekEnd)}`,
          ),
        ),
      ),
      orderBy: (tk, { asc }) => [asc(tk.dueDate), asc(tk.createdAt)],
      with: { pillar: true, project: true, event: true, assignee: true },
      limit: 20,
    }),
    contactsTrend(30),
    eventsTrend(30),
    tasksTrend(30),
    db
      .select({
        stage: contacts.stage,
        count: sql<number>`count(*)::int`,
      })
      .from(contacts)
      .groupBy(contacts.stage),
    hasDocs
      ? db.query.documents
          .findMany({
            orderBy: [desc(documents.createdAt)],
            limit: 5,
            with: { pillar: true },
          })
          .catch(() => [] as never[])
      : Promise.resolve([] as never[]),
    hasFinance
      ? db
          .select({
            type: transactions.type,
            total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
          })
          .from(transactions)
          .where(
            and(
              eq(transactions.status, "paid"),
              gte(transactions.date, monthStart),
            ),
          )
          .groupBy(transactions.type)
          .catch(
            () =>
              [] as Array<{ type: "income" | "expense"; total: string }>,
          )
      : Promise.resolve([] as Array<{ type: "income" | "expense"; total: string }>),
  ]);

  const mtdIncome = Number(mtdAgg.find((r) => r.type === "income")?.total ?? 0);
  const mtdExpense = Number(mtdAgg.find((r) => r.type === "expense")?.total ?? 0);
  const mtdNet = mtdIncome - mtdExpense;

  const stageCounts = new Map(contactsByStage.map((r) => [r.stage, r.count]));
  const stageTotal = contactsByStage.reduce((s, r) => s + r.count, 0);

  // KPI list — finance replaces documents when user has finance skill
  type Kpi = {
    key: string;
    icon: React.ComponentType<{ className?: string }>;
    value: string | number;
    hint: string;
    href: string;
    trend?: typeof contactsT;
    color?: string;
    showFor: boolean;
  };
  const kpis: Kpi[] = [
    {
      key: "contacts",
      icon: Users,
      value: contactsCount[0]?.count ?? 0,
      hint: t("kpis.leadsActive", { count: leadCount[0]?.count ?? 0 }),
      href: "/crm",
      trend: contactsT,
      color: "#A8E6E2",
      showFor: hasCrm,
    },
    {
      key: "events",
      icon: Calendar,
      value: upcomingEventsCount[0]?.count ?? 0,
      hint: t("kpis.upcomingEvents"),
      href: "/ops/events",
      trend: eventsT,
      color: "#0E2A44",
      showFor: hasOps,
    },
    {
      key: "tasks",
      icon: ListTodo,
      value: openTasksCount[0]?.count ?? 0,
      hint: t("kpis.openTasks"),
      href: "/ops/tasks",
      trend: tasksT,
      color: "#A8E6E2",
      showFor: hasOps,
    },
    hasFinance
      ? {
          key: "finance",
          icon: Wallet,
          value: fmtEur(mtdNet),
          hint: t("kpis.mtdNet", {
            income: fmtEur(mtdIncome),
            expense: fmtEur(mtdExpense),
          }),
          href: "/finance",
          showFor: true,
        }
      : {
          key: "documents",
          icon: FileText,
          value: docsCount[0]?.count ?? 0,
          hint: t("kpis.documentsHint"),
          href: "/docs",
          showFor: hasDocs,
        },
  ].filter((k) => k.showFor);

  // Quick actions — skill-aware
  type QA = {
    key: string;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    href: string;
  };
  const quickActions: QA[] = [
    hasCrm && {
      key: "newContact" as const,
      icon: UserPlus,
      label: t("quick.newContact"),
      href: "/crm/contacts/new",
    },
    hasOps && {
      key: "newEvent" as const,
      icon: Calendar,
      label: t("quick.newEvent"),
      href: "/ops/events/new",
    },
    hasOps && {
      key: "newProject" as const,
      icon: FolderPlus,
      label: t("quick.newProject"),
      href: "/ops/projects/new",
    },
    hasOps && {
      key: "newTask" as const,
      icon: ListTodo,
      label: t("quick.newTask"),
      href: "/ops/tasks/new",
    },
    hasDocs && {
      key: "newDoc" as const,
      icon: FilePlus,
      label: t("quick.newDoc"),
      href: "/docs/new",
    },
    hasFinance && {
      key: "newExpense" as const,
      icon: TrendingDown,
      label: t("quick.newExpense"),
      href: "/finance/new?type=expense",
    },
    hasFinance && {
      key: "newIncome" as const,
      icon: TrendingUp,
      label: t("quick.newIncome"),
      href: "/finance/new?type=income",
    },
  ].filter(Boolean) as QA[];

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

      {/* Quick actions */}
      {quickActions.length > 0 && (
        <section className="flex flex-wrap gap-2">
          {quickActions.map((q) => {
            const Icon = q.icon;
            return (
              <Button key={q.key} asChild size="sm" variant="outline">
                <Link href={q.href}>
                  <Icon className="mr-2 h-3.5 w-3.5" />
                  {q.label}
                </Link>
              </Button>
            );
          })}
        </section>
      )}

      {/* KPI cards */}
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
                  <p
                    className={`font-display text-4xl ${
                      k.key === "finance" && mtdNet < 0
                        ? "text-destructive"
                        : "text-foreground"
                    }`}
                  >
                    {k.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{k.hint}</p>
                  {k.trend && (
                    <div className="mt-3">
                      <ActivityTrend
                        data={k.trend}
                        color={k.color}
                        label={k.key}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>

      {/* Week + pipeline */}
      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t("thisWeek")}</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardDescription>{t("thisWeekHint")}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {weekEvents.length === 0 && weekTasks.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground italic">
                {t("thisWeekEmpty")}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {weekEvents.map((e) => (
                  <li key={`ev-${e.id}`}>
                    <Link
                      href={`/ops/events/${e.id}`}
                      className="flex items-center justify-between gap-3 px-6 py-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">
                            {e.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {e.pillar?.name ?? ""}
                            {e.location ? ` · ${e.location}` : ""}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground shrink-0">
                        {e.startAt
                          ? new Intl.DateTimeFormat("pt-PT", {
                              weekday: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            }).format(e.startAt)
                          : "—"}
                      </div>
                    </Link>
                  </li>
                ))}
                {weekTasks.map((tk) => (
                  <li key={`tk-${tk.id}`}>
                    <Link
                      href={`/ops/tasks/${tk.id}`}
                      className="flex items-center justify-between gap-3 px-6 py-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <ListTodo className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">
                            {tk.title}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {tk.assignee?.fullName ?? tk.assignee?.email ?? "—"}
                            {tk.project ? ` · ${tk.project.name}` : ""}
                            {tk.event ? ` · ${tk.event.name}` : ""}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground shrink-0">
                        {tk.dueDate ?? t("noDueDate")}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {hasCrm && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t("pipelineTitle")}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardDescription>
                {t("pipelineHint", { total: stageTotal })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stageTotal === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  {t("pipelineEmpty")}
                </p>
              ) : (
                <ul className="space-y-3">
                  {STAGES.map((s) => {
                    const c = stageCounts.get(s) ?? 0;
                    const pct = stageTotal === 0 ? 0 : (c / stageTotal) * 100;
                    return (
                      <li key={s}>
                        <Link
                          href={`/crm?stage=${s}`}
                          className="block group"
                        >
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-foreground group-hover:underline">
                              {tStages(s)}
                            </span>
                            <span className="text-muted-foreground tabular-nums">
                              {c}
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-accent"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </section>

      {/* Recent docs (only if has docs skill) */}
      {hasDocs && recentDocs.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t("recentDocs")}</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {recentDocs.map((d) => (
                <li key={d.id}>
                  <Link
                    href={`/docs/${d.id}`}
                    className="flex items-center justify-between gap-3 px-6 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          {d.title}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {d.pillar?.name ?? ""} · {d.fileName}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0">
                      {new Intl.DateTimeFormat("pt-PT", {
                        dateStyle: "short",
                      }).format(d.createdAt)}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

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
