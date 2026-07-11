import Link from "next/link";
import {
  Plus,
  Receipt,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { and, desc, eq, gte, lte, sql, type SQL } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { getAllPillars, requireSkill } from "@/lib/dal";
import {
  MonthlyCashflow,
  type MonthlyPoint,
} from "@/components/charts/monthly-cashflow";
import { Pagination } from "@/components/pagination";
import { parsePagination } from "@/lib/pagination";

type SearchParams = Promise<{
  type?: string;
  status?: string;
  pillar?: string;
  month?: string; // YYYY-MM
  page?: string;
  perPage?: string;
}>;

const TYPES = ["income", "expense"] as const;
const STATUSES = ["pending", "paid", "overdue", "cancelled"] as const;

function fmtEur(n: number, max = 0): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: max,
  }).format(n);
}

function fmtMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function fmtMonthLabel(monthIso: string): string {
  // monthIso = YYYY-MM
  const [y, m] = monthIso.split("-").map(Number);
  if (!y || !m) return monthIso;
  return new Intl.DateTimeFormat("pt-PT", {
    month: "short",
    year: "2-digit",
  }).format(new Date(y, m - 1, 1));
}

function lastNMonths(n: number): string[] {
  const out: string[] = [];
  const cur = new Date();
  cur.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(cur.getFullYear(), cur.getMonth() - i, 1);
    out.push(fmtMonth(d));
  }
  return out;
}

export default async function FinancePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireSkill("finance");
  const t = await getTranslations("finance");
  const tTypes = await getTranslations("finance.types");
  const tStatuses = await getTranslations("finance.statuses");
  const tCommon = await getTranslations("common");

  const sp = await searchParams;
  const allPillars = await getAllPillars();
  const pillarBySlug = sp.pillar
    ? allPillars.find((p) => p.slug === sp.pillar)
    : null;

  // Month filter — YYYY-MM string. If absent, no month filter (show all in list, but charts use last 12).
  const monthFilter = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : null;
  const monthFilterStart = monthFilter ? `${monthFilter}-01` : null;
  const monthFilterEnd = monthFilter
    ? (() => {
        const [y, m] = monthFilter.split("-").map(Number);
        const next = new Date(y, m, 0);
        return `${monthFilter}-${String(next.getDate()).padStart(2, "0")}`;
      })()
    : null;

  const filters: (SQL | undefined)[] = [
    pillarBySlug ? eq(transactions.pillarId, pillarBySlug.id) : undefined,
    sp.type && (TYPES as readonly string[]).includes(sp.type)
      ? eq(transactions.type, sp.type as (typeof TYPES)[number])
      : undefined,
    sp.status && (STATUSES as readonly string[]).includes(sp.status)
      ? eq(transactions.status, sp.status as (typeof STATUSES)[number])
      : undefined,
    monthFilterStart ? gte(transactions.date, monthFilterStart) : undefined,
    monthFilterEnd ? lte(transactions.date, monthFilterEnd) : undefined,
  ];
  const where = filters.some(Boolean) ? and(...filters) : undefined;
  const hasActiveFilters = Boolean(
    sp.pillar || sp.type || sp.status || sp.month,
  );

  // Date range for KPIs
  const yearStart = new Date(new Date().getFullYear(), 0, 1)
    .toISOString()
    .slice(0, 10);
  const monthStart = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  )
    .toISOString()
    .slice(0, 10);

  // Last 12 months range for chart
  const chartStart = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 11);
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  })();

  const pagination = parsePagination(sp, 25);

  const [rows, totalRows, ytdAgg, mtdAgg, cashflowRaw, byCategoryRaw] =
    await Promise.all([
      db.query.transactions.findMany({
        with: { pillar: true, event: true, project: true },
        where,
        orderBy: [desc(transactions.date), desc(transactions.createdAt)],
        limit: pagination.limit,
        offset: pagination.offset,
      }),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(transactions)
        .where(where ?? sql`true`)
        .then((r) => r[0]?.count ?? 0),
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
    db
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
      .groupBy(transactions.type),
    db
      .select({
        month: sql<string>`to_char(${transactions.date}::date, 'YYYY-MM')`,
        type: transactions.type,
        total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.status, "paid"),
          gte(transactions.date, chartStart),
        ),
      )
      .groupBy(
        sql`to_char(${transactions.date}::date, 'YYYY-MM')`,
        transactions.type,
      ),
    db
      .select({
        category: sql<string>`coalesce(${transactions.category}, '—')`,
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
      .groupBy(sql`coalesce(${transactions.category}, '—')`, transactions.type),
  ]);

  const ytd = {
    income: Number(ytdAgg.find((r) => r.type === "income")?.total ?? 0),
    expense: Number(ytdAgg.find((r) => r.type === "expense")?.total ?? 0),
  };
  const mtd = {
    income: Number(mtdAgg.find((r) => r.type === "income")?.total ?? 0),
    expense: Number(mtdAgg.find((r) => r.type === "expense")?.total ?? 0),
  };

  // Build last-12-months cashflow series, zero-filling gaps
  const cashflow: MonthlyPoint[] = lastNMonths(12).map((monthIso) => {
    const income = Number(
      cashflowRaw.find((r) => r.month === monthIso && r.type === "income")
        ?.total ?? 0,
    );
    const expense = Number(
      cashflowRaw.find((r) => r.month === monthIso && r.type === "expense")
        ?.total ?? 0,
    );
    return {
      month: fmtMonthLabel(monthIso),
      income,
      expense,
      net: income - expense,
    };
  });

  // Top categories — by expense
  const topExpenseCategories = byCategoryRaw
    .filter((r) => r.type === "expense")
    .map((r) => ({ category: r.category, total: Number(r.total) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const topIncomeCategories = byCategoryRaw
    .filter((r) => r.type === "income")
    .map((r) => ({ category: r.category, total: Number(r.total) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

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
            <Link href="/finance/new?type=income">
              <TrendingUp className="mr-2 h-4 w-4" />
              {t("addIncome")}
            </Link>
          </Button>
          <Button asChild>
            <Link href="/finance/new?type=expense">
              <Plus className="mr-2 h-4 w-4" />
              {t("addExpense")}
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <section className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="uppercase text-xs tracking-wider">
              {t("ytdIncome")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-display text-3xl text-foreground">
              {fmtEur(ytd.income)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{t("ytdHint")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="uppercase text-xs tracking-wider">
              {t("ytdExpense")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-display text-3xl text-foreground">
              {fmtEur(ytd.expense)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{t("ytdHint")}</p>
          </CardContent>
        </Card>

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
              className={`font-display text-3xl ${ytd.income - ytd.expense >= 0 ? "text-foreground" : "text-destructive"}`}
            >
              {fmtEur(ytd.income - ytd.expense)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("mtdHint", {
                income: fmtEur(mtd.income),
                expense: fmtEur(mtd.expense),
              })}
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Cashflow chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("cashflowTitle")}</CardTitle>
          <CardDescription>{t("cashflowSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <MonthlyCashflow
            data={cashflow}
            labels={{
              income: tTypes("income"),
              expense: tTypes("expense"),
              net: t("ytdNet"),
            }}
          />
        </CardContent>
      </Card>

      {/* Top categories */}
      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("topExpenseCategories")}
            </CardTitle>
            <CardDescription>{t("ytdHint")}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {topExpenseCategories.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground italic">
                {t("noCategories")}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {topExpenseCategories.map((c) => (
                  <li
                    key={c.category}
                    className="flex items-center justify-between px-6 py-3 text-sm"
                  >
                    <span className="text-foreground">{c.category}</span>
                    <span className="font-medium text-foreground tabular-nums">
                      {fmtEur(c.total)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("topIncomeCategories")}
            </CardTitle>
            <CardDescription>{t("ytdHint")}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {topIncomeCategories.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground italic">
                {t("noCategories")}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {topIncomeCategories.map((c) => (
                  <li
                    key={c.category}
                    className="flex items-center justify-between px-6 py-3 text-sm"
                  >
                    <span className="text-foreground">{c.category}</span>
                    <span className="font-medium text-foreground tabular-nums">
                      {fmtEur(c.total)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Filters */}
      <form
        action="/finance"
        method="get"
        className="flex flex-wrap items-end gap-3 border-y border-border py-4"
      >
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
            {t("monthFilter")}
          </label>
          <input
            type="month"
            name="month"
            defaultValue={sp.month ?? ""}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs"
          />
        </div>

        <Button type="submit" size="sm">
          {tCommon("filter")}
        </Button>
        {hasActiveFilters && (
          <Button asChild variant="ghost" size="sm">
            <Link href="/finance">{tCommon("cancel")}</Link>
          </Button>
        )}
      </form>

      <p className="text-sm text-muted-foreground">
        {t("count", { count: totalRows })}
      </p>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Receipt className="h-5 w-5" />}
          title={t("empty")}
          description={t("emptyDescription")}
          action={{ label: t("addTransaction"), href: "/finance/new" }}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/30">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                      {t("table.date")}
                    </th>
                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                      {t("table.description")}
                    </th>
                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                      {t("table.linked")}
                    </th>
                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                      {t("table.status")}
                    </th>
                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                      {t("table.pillar")}
                    </th>
                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground text-right">
                      {t("table.amount")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((tx) => (
                    <tr
                      key={tx.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-muted-foreground">
                        <Link
                          href={`/finance/${tx.id}`}
                          className="block py-1 -my-1"
                        >
                          {tx.date}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/finance/${tx.id}`}
                          className="block py-1 -my-1"
                        >
                          <span className="flex items-center gap-2">
                            {tx.type === "income" ? (
                              <TrendingUp className="h-3.5 w-3.5 text-foreground" />
                            ) : (
                              <TrendingDown className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                            <span className="font-medium text-foreground">
                              {tx.description}
                            </span>
                          </span>
                          {tx.vendor && (
                            <span className="block text-xs text-muted-foreground ml-5">
                              {tx.vendor}
                            </span>
                          )}
                          {tx.category && (
                            <span className="block text-xs text-muted-foreground ml-5">
                              {tx.category}
                            </span>
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {tx.event && (
                          <Link
                            href={`/ops/events/${tx.event.id}`}
                            className="block hover:text-foreground"
                          >
                            {t("eventBadge", { name: tx.event.name })}
                          </Link>
                        )}
                        {tx.project && (
                          <Link
                            href={`/ops/projects/${tx.project.id}`}
                            className="block hover:text-foreground"
                          >
                            {t("projectBadge", { name: tx.project.name })}
                          </Link>
                        )}
                        {!tx.event && !tx.project && "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/finance/${tx.id}`}
                          className="inline-flex items-center rounded-full bg-accent/40 px-2 py-0.5 text-xs text-foreground"
                        >
                          {tStatuses(tx.status)}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <Link
                          href={`/finance/${tx.id}`}
                          className="block py-1 -my-1"
                        >
                          {tx.pillar?.name ?? "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">
                        <Link
                          href={`/finance/${tx.id}`}
                          className={`block py-1 -my-1 ${tx.type === "income" ? "text-foreground" : "text-destructive"}`}
                        >
                          {tx.type === "expense" ? "−" : ""}
                          {new Intl.NumberFormat("pt-PT", {
                            style: "currency",
                            currency: tx.currency,
                          }).format(Number(tx.amount))}
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
        basePath="/finance"
        searchParams={sp}
        page={pagination.page}
        pageSize={pagination.pageSize}
        total={totalRows}
      />
    </div>
  );
}
