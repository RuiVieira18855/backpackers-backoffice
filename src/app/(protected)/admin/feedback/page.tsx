import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { desc, sql } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { cairnFeedback } from "@/lib/db/schema";
import { requireSkill } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Row = {
  id: string;
  email: string | null;
  kind: string | null;
  message: string;
  rating: number | null;
  url: string | null;
  createdAt: Date;
};

const KIND_STYLE: Record<string, string> = {
  bug: "bg-red-500/10 text-red-600 dark:text-red-400",
  idea: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  other: "bg-muted text-muted-foreground",
};

function fmtDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default async function CairnFeedbackPage() {
  await requireSkill("admin");
  const t = await getTranslations("admin.feedback");

  let rows: Row[] = [];
  const counts = { bug: 0, idea: 0, other: 0, total: 0 };
  try {
    rows = await db
      .select({
        id: cairnFeedback.id,
        email: cairnFeedback.email,
        kind: cairnFeedback.kind,
        message: cairnFeedback.message,
        rating: cairnFeedback.rating,
        url: cairnFeedback.url,
        createdAt: cairnFeedback.createdAt,
      })
      .from(cairnFeedback)
      .orderBy(desc(cairnFeedback.createdAt))
      .limit(200);

    const aggs = await db
      .select({ kind: cairnFeedback.kind, count: sql<number>`count(*)::int` })
      .from(cairnFeedback)
      .groupBy(cairnFeedback.kind);
    for (const a of aggs) {
      counts.total += a.count;
      if (a.kind === "bug") counts.bug += a.count;
      else if (a.kind === "idea") counts.idea += a.count;
      else counts.other += a.count;
    }
  } catch (err) {
    console.error("[admin/feedback] load failed:", err);
  }

  const kindLabel = (k: string | null) =>
    k === "bug" || k === "idea" || k === "other" ? t(`kinds.${k}`) : (k ?? "-");

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
          <Link href="/admin">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("backToAdmin")}
          </Link>
        </Button>
        <h1 className="font-display text-4xl sm:text-5xl text-foreground leading-none">
          {t("title")}
        </h1>
        <p className="mt-2 text-base text-muted-foreground">{t("subtitle")}</p>
      </div>

      <section className="grid grid-cols-4 gap-3 text-center text-sm">
        {(["bug", "idea", "other", "total"] as const).map((k) => (
          <Card key={k}>
            <CardContent className="py-4">
              <p className="text-2xl font-medium tabular-nums text-foreground">
                {counts[k]}
              </p>
              <p className="text-muted-foreground text-xs">
                {k === "total" ? t("total") : t(`kinds.${k}`)}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground italic">
            {t("empty")}
          </CardContent>
        </Card>
      ) : (
        <section className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] uppercase tracking-wider rounded px-1.5 py-0.5 ${KIND_STYLE[r.kind ?? "other"] ?? KIND_STYLE.other}`}
                    >
                      {kindLabel(r.kind)}
                    </span>
                    {r.rating ? (
                      <span className="text-amber-500 text-xs" aria-label={`${r.rating}/5`}>
                        {"★".repeat(r.rating)}
                        <span className="text-muted-foreground">
                          {"★".repeat(Math.max(0, 5 - r.rating))}
                        </span>
                      </span>
                    ) : null}
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                    {fmtDate(r.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                  {r.message}
                </p>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{r.email ?? t("anon")}</span>
                  {r.url ? (
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="underline-offset-2 hover:underline truncate max-w-[50%]"
                    >
                      {r.url}
                    </a>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
