import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Printer } from "lucide-react";
import { and, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import {
  TRAIL_VALUE_KEYS,
  TRAIL_VALUE_LABELS,
  trailAssessments,
  type TrailValueKey,
} from "@/lib/db/schema";
import { requireProfile } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TrailSpiderChart } from "@/components/trail/spider-chart";
import { sortedByScore } from "@/lib/trail";
import {
  TRAIL_CONTENT,
  overallReading,
  scoreBandFor,
} from "@/data/trail-content";

type Props = { params: Promise<{ id: string }> };

export default async function TrailReportPage({ params }: Props) {
  const profile = await requireProfile();
  const { id } = await params;
  const t = await getTranslations("trail.report");

  const isAdmin =
    profile.role === "super_user" ||
    profile.role === "admin_grupo" ||
    profile.role === "admin_pilar";

  const where = isAdmin
    ? eq(trailAssessments.id, id)
    : and(
        eq(trailAssessments.id, id),
        eq(trailAssessments.userId, profile.id),
      );

  const assessment = await db.query.trailAssessments.findFirst({
    where,
    with: { user: true },
  });
  if (!assessment) notFound();
  if (assessment.status !== "completed") notFound();

  const scores: Record<TrailValueKey, number> = {
    T: assessment.scoreT ?? 0,
    R: assessment.scoreR ?? 0,
    I: assessment.scoreI ?? 0,
    L: assessment.scoreL ?? 0,
    H: assessment.scoreH ?? 0,
    A: assessment.scoreA ?? 0,
  };
  const ranked = sortedByScore(scores);
  const dominant = ranked[0];
  const support = ranked.slice(1, 3);
  const weakest = ranked[5];
  const overall = overallReading(scores);

  const name = assessment.user?.fullName ?? assessment.user?.email ?? "—";
  const dateStr = assessment.completedAt
    ? new Intl.DateTimeFormat("pt-PT", { dateStyle: "long" }).format(
        assessment.completedAt,
      )
    : "";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-12 space-y-12 print:py-4 print:space-y-8">
      <div className="print:hidden">
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-4">
          <Link href={`/trail/${assessment.id}`}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("back")}
          </Link>
        </Button>
      </div>

      {/* ---------- Cover ---------- */}
      <header className="space-y-3 border-b border-border pb-8">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {t("kicker")}
        </p>
        <h1 className="font-display text-5xl sm:text-6xl text-foreground leading-none">
          {t("title")}
        </h1>
        <p className="text-base text-muted-foreground">
          {t("cover.for", { name, date: dateStr })}
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-4 print:hidden">
          <Button variant="outline" size="sm" asChild>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (typeof window !== "undefined") window.print();
              }}
            >
              <Printer className="mr-2 h-3.5 w-3.5" />
              {t("printCta")}
            </a>
          </Button>
        </div>
      </header>

      {/* ---------- Snapshot ---------- */}
      <section className="grid gap-6 md:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <h2 className="font-display text-2xl text-foreground">
            {t("snapshot.title")}
          </h2>
          <p className="text-base leading-relaxed text-foreground">
            {t("snapshot.leadHigh", {
              dominant: TRAIL_VALUE_LABELS[dominant.value],
              score: dominant.score,
            })}
            {" "}
            {t("snapshot.leadSupport", {
              s1: TRAIL_VALUE_LABELS[support[0].value],
              s2: TRAIL_VALUE_LABELS[support[1].value],
            })}
            {" "}
            {t("snapshot.leadLow", {
              weakest: TRAIL_VALUE_LABELS[weakest.value],
              score: weakest.score,
            })}
          </p>
          <ol className="space-y-2 pt-2">
            {ranked.map((r, i) => (
              <li key={r.value}>
                <div className="flex items-baseline justify-between text-sm mb-1">
                  <span className="text-foreground">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted text-muted-foreground text-[10px] mr-2 tabular-nums">
                      {i + 1}
                    </span>
                    <span className="mr-1">
                      {TRAIL_CONTENT[r.value].emoji}
                    </span>
                    {TRAIL_VALUE_LABELS[r.value]}
                  </span>
                  <span className="text-foreground tabular-nums font-medium">
                    {r.score}
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent"
                    style={{ width: `${r.score}%` }}
                  />
                </div>
              </li>
            ))}
          </ol>
        </div>
        <Card>
          <CardContent className="p-3">
            <TrailSpiderChart
              scores={scores}
              className="w-full text-muted-foreground"
            />
          </CardContent>
        </Card>
      </section>

      {/* ---------- Overall reading ---------- */}
      <section className="space-y-3">
        <h2 className="font-display text-2xl text-foreground">
          {t("overall.title")}
        </h2>
        <div className="text-base leading-relaxed text-foreground whitespace-pre-wrap">
          {overall.split("\n\n").map((para, i) => (
            <p key={i} className="mb-4">
              {renderInlineBold(para)}
            </p>
          ))}
        </div>
      </section>

      {/* ---------- Per-pillar deep dive ---------- */}
      {TRAIL_VALUE_KEYS.map((k) => {
        const content = TRAIL_CONTENT[k];
        const score = scores[k];
        const band = scoreBandFor(score);
        const otherPillars = TRAIL_VALUE_KEYS.filter((x) => x !== k);
        return (
          <section
            key={k}
            className="space-y-6 border-t border-border pt-8 print:break-before-page"
          >
            <div className="flex items-baseline justify-between gap-4 flex-wrap">
              <h2 className="font-display text-3xl text-foreground">
                {content.emoji} {content.name}
              </h2>
              <span className="font-display text-2xl text-foreground tabular-nums">
                {score}
                <span className="text-sm text-muted-foreground">/100</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground italic">
              {content.short}
            </p>
            <div className="space-y-4">
              {content.description.split("\n\n").map((p, i) => (
                <p key={i} className="text-base text-foreground leading-relaxed">
                  {renderInlineBold(p)}
                </p>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <MiniList
                title={t("pillar.behaviors")}
                items={content.behaviors}
              />
              <MiniList
                title={t("pillar.strengths")}
                items={content.strengths}
              />
              <MiniList title={t("pillar.shadows")} items={content.shadows} />
            </div>

            <Card className="border-accent/40 bg-accent/5">
              <CardContent className="p-6 space-y-2">
                <p className="text-xs uppercase tracking-wider text-accent-foreground/70">
                  {t("pillar.yourBand", {
                    band: t(`pillar.bands.${band}`),
                    score,
                  })}
                </p>
                <p className="text-base leading-relaxed text-foreground">
                  {renderInlineBold(content.scoreBands[band])}
                </p>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <h3 className="font-display text-lg text-foreground">
                {t("pillar.growth")}
              </h3>
              <ul className="space-y-2">
                {content.growthPaths.map((g, i) => (
                  <li
                    key={i}
                    className="text-base text-foreground leading-relaxed flex gap-2"
                  >
                    <span className="text-accent-foreground shrink-0">→</span>
                    <span>{renderInlineBold(g)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="font-display text-lg text-foreground">
                {t("pillar.interactions")}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {otherPillars.map((other) => {
                  const text = content.interactions[other];
                  if (!text) return null;
                  return (
                    <Card key={other}>
                      <CardContent className="p-4 space-y-1">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">
                          <span className="mr-1">
                            {TRAIL_CONTENT[other].emoji}
                          </span>
                          {t("pillar.withValue", {
                            value: TRAIL_VALUE_LABELS[other],
                          })}
                        </p>
                        <p className="text-sm text-foreground leading-relaxed">
                          {renderInlineBold(text)}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}

      {/* ---------- Closing ---------- */}
      <section className="space-y-3 border-t border-border pt-8">
        <h2 className="font-display text-2xl text-foreground">
          {t("closing.title")}
        </h2>
        <p className="text-base text-foreground leading-relaxed">
          {t("closing.body")}
        </p>
        <p className="text-xs text-muted-foreground italic">
          {t("closing.disclaimer")}
        </p>
      </section>
    </div>
  );
}

function MiniList({ title, items }: { title: string; items: string[] }) {
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          {title}
        </p>
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li
              key={i}
              className="text-xs text-foreground leading-snug flex gap-1.5"
            >
              <span className="text-muted-foreground shrink-0">·</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/** Renders **bold** in plain text without a markdown library. */
function renderInlineBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return <strong key={i}>{p.slice(2, -2)}</strong>;
    }
    return <span key={i}>{p}</span>;
  });
}
