import Link from "next/link";
import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { desc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { hasSkill } from "@/lib/dal";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Props = {
  /** Either eventId XOR projectId */
  eventId?: string;
  projectId?: string;
};

function fmtEur(n: number, currency = "EUR"): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(n);
}

/**
 * Server component — renders a transactions section linked to the given event
 * or project. Only visible to users with the `finance` skill (or super_user).
 *
 * Hides itself silently when the viewer doesn't have finance access, so it can
 * be dropped into any event/project detail page without a guard.
 */
export async function LinkedFinanceCard({ eventId, projectId }: Props) {
  // Guard: silently render nothing if no finance access
  const allowed = await hasSkill("finance");
  if (!allowed) return null;
  if (!eventId && !projectId) return null;

  const t = await getTranslations("finance.linked");
  const tTypes = await getTranslations("finance.types");
  const tStatuses = await getTranslations("finance.statuses");

  const where = eventId
    ? eq(transactions.eventId, eventId)
    : eq(transactions.projectId, projectId!);

  const rows = await db.query.transactions.findMany({
    where,
    orderBy: [desc(transactions.date), desc(transactions.createdAt)],
    limit: 20,
  });

  // Aggregate totals (counted as committed regardless of status,
  // but split paid vs pending so user sees both)
  let income = 0;
  let expense = 0;
  for (const tx of rows) {
    const amt = Number(tx.amount);
    if (tx.type === "income") income += amt;
    else expense += amt;
  }
  const net = income - expense;

  const newQuery = eventId ? `event=${eventId}` : `project=${projectId}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              {t("title")}
            </CardTitle>
            <CardDescription>
              {t("count", { count: rows.length })}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/finance/new?${newQuery}&type=income`}>
                <TrendingUp className="mr-2 h-3.5 w-3.5" />
                {t("addIncome")}
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/finance/new?${newQuery}&type=expense`}>
                <TrendingDown className="mr-2 h-3.5 w-3.5" />
                {t("addExpense")}
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>

      {rows.length > 0 && (
        <CardContent className="p-0">
          {/* Summary strip */}
          <div className="grid grid-cols-3 border-y border-border bg-muted/20 text-sm">
            <div className="px-4 py-3 text-center">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                {tTypes("income")}
              </div>
              <div className="font-medium text-foreground tabular-nums">
                {fmtEur(income)}
              </div>
            </div>
            <div className="px-4 py-3 text-center border-x border-border">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                {tTypes("expense")}
              </div>
              <div className="font-medium text-destructive tabular-nums">
                {fmtEur(expense)}
              </div>
            </div>
            <div className="px-4 py-3 text-center">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                {t("net")}
              </div>
              <div
                className={`font-medium tabular-nums ${net >= 0 ? "text-foreground" : "text-destructive"}`}
              >
                {fmtEur(net)}
              </div>
            </div>
          </div>

          <ul className="divide-y divide-border">
            {rows.map((tx) => (
              <li key={tx.id}>
                <Link
                  href={`/finance/${tx.id}`}
                  className="flex items-center justify-between gap-3 px-6 py-3 hover:bg-muted/30 transition-colors text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {tx.type === "income" ? (
                        <TrendingUp className="h-3.5 w-3.5 text-foreground shrink-0" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      )}
                      <span className="font-medium text-foreground truncate">
                        {tx.description}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-accent/40 px-2 py-0.5 text-xs text-foreground shrink-0">
                        {tStatuses(tx.status)}
                      </span>
                    </div>
                    {tx.category && (
                      <div className="text-xs text-muted-foreground ml-5 mt-0.5">
                        {tx.category}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div
                      className={`font-medium tabular-nums ${tx.type === "income" ? "text-foreground" : "text-destructive"}`}
                    >
                      {tx.type === "expense" ? "−" : ""}
                      {fmtEur(Number(tx.amount), tx.currency)}
                    </div>
                    <div className="text-xs text-muted-foreground">{tx.date}</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      )}

      {rows.length === 0 && (
        <CardContent>
          <p className="text-sm text-muted-foreground italic">{t("empty")}</p>
        </CardContent>
      )}
    </Card>
  );
}
