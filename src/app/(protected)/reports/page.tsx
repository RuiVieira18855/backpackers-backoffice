import Link from "next/link";
import {
  Award,
  Calendar,
  ListTodo,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { and, eq, gte, sql } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import {
  contacts,
  deals,
  events,
  tasks,
  transactions,
} from "@/lib/db/schema";
import { hasSkill, requireProfile } from "@/lib/dal";
import { PrintButton } from "@/components/print-button";
import { SalesFunnel } from "@/components/reports/sales-funnel";
import { ContactCohort, type CohortRow } from "@/components/reports/contact-cohort";

function fmtEur(n: number, max = 0): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: max,
  }).format(n);
}

function pct(n: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((n / total) * 100);
}

export default async function ReportsPage() {
  await requireProfile();
  const t = await getTranslations("reports");
  const tDealStages = await getTranslations("deals.stages");
  const tContactStages = await getTranslations("crm.stages");

  const [hasFinance, hasCrm, hasOps] = await Promise.all([
    hasSkill("finance"),
    hasSkill("crm"),
    hasSkill("ops"),
  ]);

  const yearStart = new Date(new Date().getFullYear(), 0, 1)
    .toISOString()
    .slice(0, 10);

  const safe = async <T,>(p: Promise<T>, fallback: T): Promise<T> => {
    try {
      return await p;
    } catch (err) {
      console.error("[reports] query failed:", err);
      return fallback;
    }
  };

  // Deals: value by stage + win rate
  const dealsByStage = hasCrm
    ? await safe(
        db
          .select({
            stage: deals.stage,
            count: sql<number>`count(*)::int`,
            value: sql<string>`coalesce(sum(${deals.value}), 0)`,
          })
          .from(deals)
          .groupBy(deals.stage),
        [] as Array<{ stage: string; count: number; value: string }>,
      )
    : [];

  const wonCount = Number(
    dealsByStage.find((r) => r.stage === "won")?.count ?? 0,
  );
  const lostCount = Number(
    dealsByStage.find((r) => r.stage === "lost")?.count ?? 0,
  );
  const wonValue = Number(
    dealsByStage.find((r) => r.stage === "won")?.value ?? 0,
  );
  const openValue = dealsByStage
    .filter((r) => !["won", "lost"].includes(r.stage))
    .reduce((acc, r) => acc + Number(r.value ?? 0), 0);
  const winRate = pct(wonCount, wonCount + lostCount);

  // Contacts by stage
  const contactsByStage = hasCrm
    ? await safe(
        db
          .select({
            stage: contacts.stage,
            count: sql<number>`count(*)::int`,
          })
          .from(contacts)
          .groupBy(contacts.stage),
        [] as Array<{ stage: string; count: number }>,
      )
    : [];
  const totalContacts = contactsByStage.reduce((s, r) => s + r.count, 0);

  // Tasks completion rate (YTD)
  const tasksAgg = hasOps
    ? await safe(
        db
          .select({
            done: sql<number>`count(*) FILTER (WHERE ${tasks.status} = 'done')::int`,
            total: sql<number>`count(*)::int`,
          })
          .from(tasks)
          .where(gte(tasks.createdAt, new Date(yearStart))),
        [{ done: 0, total: 0 }],
      )
    : [{ done: 0, total: 0 }];
  const tasksDone = tasksAgg[0]?.done ?? 0;
  const tasksTotal = tasksAgg[0]?.total ?? 0;
  const tasksRate = pct(tasksDone, tasksTotal);

  // Events count YTD
  const eventsAgg = hasOps
    ? await safe(
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(events)
          .where(gte(events.createdAt, new Date(yearStart))),
        [{ count: 0 }],
      )
    : [{ count: 0 }];
  const eventsYtd = eventsAgg[0]?.count ?? 0;

  // Finance: YTD income/expense/net + monthly count of paid transactions
  const finAgg = hasFinance
    ? await safe(
        db
          .select({
            type: transactions.type,
            total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
          })
          .from(transactions)
          .where(
            and(
              eq(transactions.status, "paid"),
              gte(transactions.date, yearStart),
            ),
          )
          .groupBy(transactions.type),
        [] as Array<{ type: "income" | "expense"; total: string }>,
      )
    : [];
  const finIncome = Number(
    finAgg.find((r) => r.type === "income")?.total ?? 0,
  );
  const finExpense = Number(
    finAgg.find((r) => r.type === "expense")?.total ?? 0,
  );
  const finNet = finIncome - finExpense;

  // Contact cohort by month of creation (last 6 months)
  const cohortRows: CohortRow[] = hasCrm
    ? await safe(
        db
          .execute(
            sql`
              SELECT
                to_char(date_trunc('month', ${contacts.createdAt}), 'YYYY-MM') AS month,
                count(*)::int AS total,
                count(*) FILTER (WHERE ${contacts.stage} IN ('qualified','active'))::int AS active,
                count(*) FILTER (WHERE ${contacts.stage} = 'closed_won')::int AS won,
                count(*) FILTER (WHERE ${contacts.stage} = 'closed_lost')::int AS lost
              FROM ${contacts}
              WHERE ${contacts.createdAt} >= (now() - interval '6 months')
              GROUP BY 1
              ORDER BY 1 DESC
            `,
          )
          .then((result) => {
            const rows = Array.isArray(result)
              ? (result as Array<Record<string, unknown>>)
              : (Array.from(result as Iterable<Record<string, unknown>>));
            return rows.map((row) => ({
              month: String(row.month ?? ""),
              total: Number(row.total ?? 0),
              active: Number(row.active ?? 0),
              won: Number(row.won ?? 0),
              lost: Number(row.lost ?? 0),
            })) as CohortRow[];
          }),
        [] as CohortRow[],
      )
    : [];

  // Top customers by event count
  const topCustomers = hasCrm
    ? await safe(
        db
          .select({
            id: contacts.id,
            fullName: contacts.fullName,
            company: contacts.company,
            count: sql<number>`(SELECT count(*)::int FROM public.events WHERE client_contact_id = ${contacts.id})`,
          })
          .from(contacts)
          .where(sql`(SELECT count(*) FROM public.events WHERE client_contact_id = ${contacts.id}) > 0`)
          .orderBy(sql`(SELECT count(*) FROM public.events WHERE client_contact_id = ${contacts.id}) DESC`)
          .limit(5),
        [] as Array<{
          id: string;
          fullName: string;
          company: string | null;
          count: number;
        }>,
      )
    : [];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 space-y-10 print:py-4 print:space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-4xl sm:text-6xl text-foreground leading-none">
            {t("title")}
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <PrintButton label={t("printCta")} />
      </div>

      {/* Headline KPIs */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {hasCrm && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="uppercase text-xs tracking-wider">
                  {t("openPipelineValue")}
                </CardDescription>
                <Target className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="font-display text-3xl text-foreground">
                {fmtEur(openValue)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("openPipelineHint")}
              </p>
            </CardContent>
          </Card>
        )}

        {hasCrm && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="uppercase text-xs tracking-wider">
                  {t("winRate")}
                </CardDescription>
                <Award className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="font-display text-3xl text-foreground">
                {wonCount + lostCount === 0 ? "—" : `${winRate}%`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("winRateHint", { won: wonCount, lost: lostCount })}
              </p>
            </CardContent>
          </Card>
        )}

        {hasOps && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="uppercase text-xs tracking-wider">
                  {t("taskCompletion")}
                </CardDescription>
                <ListTodo className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="font-display text-3xl text-foreground">
                {tasksTotal === 0 ? "—" : `${tasksRate}%`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("taskCompletionHint", {
                  done: tasksDone,
                  total: tasksTotal,
                })}
              </p>
            </CardContent>
          </Card>
        )}

        {hasFinance && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="uppercase text-xs tracking-wider">
                  {t("ytdNet")}
                </CardDescription>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <p
                className={`font-display text-3xl ${finNet < 0 ? "text-destructive" : "text-foreground"}`}
              >
                {fmtEur(finNet)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("ytdNetHint", {
                  income: fmtEur(finIncome),
                  expense: fmtEur(finExpense),
                })}
              </p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Sales funnel */}
      {hasCrm && <SalesFunnel rows={dealsByStage} />}

      {/* Contact cohort */}
      {hasCrm && <ContactCohort rows={cohortRows} />}

      {/* Deals by stage */}
      {hasCrm && dealsByStage.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("dealsByStage")}</CardTitle>
            <CardDescription>{t("dealsByStageHint")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {dealsByStage.map((r) => {
                const val = Number(r.value ?? 0);
                return (
                  <li key={r.stage}>
                    <Link
                      href={`/crm/deals?stage=${r.stage}`}
                      className="block group"
                    >
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-foreground group-hover:underline">
                          {tDealStages(r.stage as never)}
                        </span>
                        <span className="text-muted-foreground tabular-nums">
                          {r.count} · {fmtEur(val)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-accent"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(
                                (val /
                                  Math.max(
                                    ...dealsByStage.map((d) =>
                                      Number(d.value ?? 0),
                                    ),
                                    1,
                                  )) *
                                  100,
                              ),
                            )}%`,
                          }}
                        />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Two-col: contacts by stage + top customers */}
      <section className="grid gap-6 lg:grid-cols-2">
        {hasCrm && totalContacts > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {t("contactsByStage")}
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardDescription>
                {t("contactsByStageHint", { total: totalContacts })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {contactsByStage.map((r) => (
                  <li key={r.stage}>
                    <Link
                      href={`/crm?stage=${r.stage}`}
                      className="block group"
                    >
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-foreground group-hover:underline">
                          {tContactStages(r.stage as never)}
                        </span>
                        <span className="text-muted-foreground tabular-nums">
                          {r.count}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-accent"
                          style={{
                            width: `${pct(r.count, totalContacts)}%`,
                          }}
                        />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {hasCrm && topCustomers.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t("topCustomers")}</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardDescription>{t("topCustomersHint")}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {topCustomers.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/crm/contacts/${c.id}`}
                      className="flex items-center justify-between px-6 py-3 hover:bg-muted/30 transition-colors text-sm"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-foreground truncate">
                          {c.fullName}
                        </div>
                        {c.company && (
                          <div className="text-xs text-muted-foreground truncate">
                            {c.company}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground shrink-0">
                        {t("eventsCount", { count: c.count })}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Ops summary */}
      {hasOps && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t("opsSummary")}</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardDescription>{t("opsSummaryHint")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t("eventsYtd")}
                </p>
                <p className="font-display text-3xl text-foreground mt-1">
                  {eventsYtd}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t("tasksDone")}
                </p>
                <p className="font-display text-3xl text-foreground mt-1">
                  {tasksDone}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t("tasksOpen")}
                </p>
                <p className="font-display text-3xl text-foreground mt-1">
                  {tasksTotal - tasksDone}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
