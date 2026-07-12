import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type StageRow = { stage: string; count: number; value: string };

const FUNNEL_ORDER = [
  "lead",
  "qualified",
  "proposal",
  "negotiation",
  "won",
] as const;

function fmtEur(n: number): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

export async function SalesFunnel({ rows }: { rows: StageRow[] }) {
  const t = await getTranslations("reports.funnel");
  const tStages = await getTranslations("deals.stages");

  const byStage = new Map(rows.map((r) => [r.stage, r]));
  const stages = FUNNEL_ORDER.map((s) => ({
    stage: s,
    count: Number(byStage.get(s)?.count ?? 0),
    value: Number(byStage.get(s)?.value ?? 0),
  }));

  const top = stages[0].count;
  if (top === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <CardDescription>{t("hint")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-2">
          {stages.map((s, i) => {
            const prev = i === 0 ? null : stages[i - 1];
            const conversion =
              prev && prev.count > 0
                ? Math.round((s.count / prev.count) * 100)
                : null;
            const widthPct = Math.max(4, Math.round((s.count / top) * 100));
            return (
              <li key={s.stage}>
                <Link
                  href={`/crm/deals?stage=${s.stage}`}
                  className="block group"
                >
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-foreground group-hover:underline">
                      {tStages(s.stage as never)}
                    </span>
                    <span className="text-muted-foreground tabular-nums text-xs">
                      {s.count} · {fmtEur(s.value)}
                      {conversion !== null && (
                        <span className="ml-2 text-[10px] uppercase tracking-wider">
                          {t("conversion", { pct: conversion })}
                        </span>
                      )}
                    </span>
                  </div>
                  <div
                    className="h-6 rounded-md bg-accent/40 group-hover:bg-accent/60 transition-colors"
                    style={{ width: `${widthPct}%` }}
                    role="img"
                    aria-label={t("barLabel", {
                      stage: tStages(s.stage as never),
                      count: s.count,
                    })}
                  />
                </Link>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
