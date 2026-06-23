import Link from "next/link";
import { Plus, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { and, desc, eq, gte, sql, type SQL } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { getAllPillars, requireRole } from "@/lib/dal";

type SearchParams = Promise<{
  type?: string;
  status?: string;
  pillar?: string;
}>;

const TYPES = ["income", "expense"] as const;
const STATUSES = ["pending", "paid", "overdue", "cancelled"] as const;

function fmtEur(n: number): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function FinancePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireRole("super_user");
  const t = await getTranslations("finance");
  const tTypes = await getTranslations("finance.types");
  const tStatuses = await getTranslations("finance.statuses");
  const tCommon = await getTranslations("common");

  const sp = await searchParams;
  const allPillars = await getAllPillars();
  const pillarBySlug = sp.pillar
    ? allPillars.find((p) => p.slug === sp.pillar)
    : null;

  const filters: (SQL | undefined)[] = [
    pillarBySlug ? eq(transactions.pillarId, pillarBySlug.id) : undefined,
    sp.type && (TYPES as readonly string[]).includes(sp.type)
      ? eq(transactions.type, sp.type as (typeof TYPES)[number])
      : undefined,
    sp.status && (STATUSES as readonly string[]).includes(sp.status)
      ? eq(transactions.status, sp.status as (typeof STATUSES)[number])
      : undefined,
  ];
  const where = filters.some(Boolean) ? and(...filters) : undefined;
  const hasActiveFilters = Boolean(sp.pillar || sp.type || sp.status);

  // Date range: current year
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

  // Aggregates (all paid only)
  const [rows, ytdAgg, mtdAgg] = await Promise.all([
    db.query.transactions.findMany({
      with: { pillar: true },
      where,
      orderBy: [desc(transactions.date), desc(transactions.createdAt)],
      limit: 300,
    }),
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
  ]);

  const ytd = {
    income: Number(ytdAgg.find((r) => r.type === "income")?.total ?? 0),
    expense: Number(ytdAgg.find((r) => r.type === "expense")?.total ?? 0),
  };
  const mtd = {
    income: Number(mtdAgg.find((r) => r.type === "income")?.total ?? 0),
    expense: Number(mtdAgg.find((r) => r.type === "expense")?.total ?? 0),
  };

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-10 py-10 space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-5xl sm:text-6xl text-foreground leading-none">
            {t("title")}
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            {t("subtitle")}
          </p>
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
            <p className="text-xs text-muted-foreground mt-1">
              {t("ytdHint")}
            </p>
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
            <p className="text-xs text-muted-foreground mt-1">
              {t("ytdHint")}
            </p>
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
        {t("count", { count: rows.length })}
      </p>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">{t("empty")}</p>
            <Button asChild className="mt-6">
              <Link href="/finance/new">
                <Plus className="mr-2 h-4 w-4" />
                {t("addTransaction")}
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
                      {t("table.date")}
                    </th>
                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                      {t("table.description")}
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
                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground text-right">
                      {t("table.amount")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((tx) => (
                    <tr
                      key={tx.id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-0">
                        <Link
                          href={`/finance/${tx.id}`}
                          className="block px-0 py-3 text-muted-foreground"
                        >
                          {tx.date}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/finance/${tx.id}`}
                          className="block py-3 -my-3 font-medium text-foreground"
                        >
                          {tx.description}
                          {tx.vendor && (
                            <span className="block text-xs text-muted-foreground">
                              {tx.vendor}
                            </span>
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/finance/${tx.id}`}
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                            tx.type === "income"
                              ? "bg-accent/40 text-foreground"
                              : "bg-muted text-foreground"
                          }`}
                        >
                          {tx.type === "income" ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {tTypes(tx.type)}
                        </Link>
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
                          className="block py-3 -my-3"
                        >
                          {tx.pillar?.name ?? "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        <Link
                          href={`/finance/${tx.id}`}
                          className={`block py-3 -my-3 ${tx.type === "income" ? "text-foreground" : "text-destructive"}`}
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
    </div>
  );
}
