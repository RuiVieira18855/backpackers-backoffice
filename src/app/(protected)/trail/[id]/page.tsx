import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { and, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { trailAssessments, TRAIL_VALUE_LABELS } from "@/lib/db/schema";
import { requireProfile } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TrailSpiderChart } from "@/components/trail/spider-chart";
import { sortedByScore } from "@/lib/trail";

type Props = { params: Promise<{ id: string }> };

export default async function TrailResultPage({ params }: Props) {
  const profile = await requireProfile();
  const { id } = await params;
  const t = await getTranslations("trail.result");

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

  const scores = {
    T: assessment.scoreT ?? 0,
    R: assessment.scoreR ?? 0,
    I: assessment.scoreI ?? 0,
    L: assessment.scoreL ?? 0,
    H: assessment.scoreH ?? 0,
    A: assessment.scoreA ?? 0,
  };
  const ranked = sortedByScore(scores);
  const dominant = ranked[0];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
          <Link href="/trail">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("back")}
          </Link>
        </Button>
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
          {t("kicker")}
        </p>
        <h1 className="font-display text-4xl sm:text-5xl text-foreground leading-none">
          {t("dominantHeadline", {
            value: TRAIL_VALUE_LABELS[dominant.value],
            score: dominant.score,
          })}
        </h1>
        {assessment.user?.fullName && (
          <p className="mt-3 text-sm text-muted-foreground">
            {t("of", { name: assessment.user.fullName })}
          </p>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-medium text-foreground mb-4">
              {t("rankingTitle")}
            </h2>
            <ol className="space-y-3">
              {ranked.map((r, i) => (
                <li key={r.value} className="space-y-1">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-foreground">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted text-muted-foreground text-[10px] mr-2 tabular-nums">
                        {i + 1}
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
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-center">
            <TrailSpiderChart
              scores={scores}
              className="w-full max-w-[320px] text-muted-foreground"
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6 space-y-3">
          <h2 className="text-lg font-medium text-foreground">
            {t("insightTitle")}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("insightBody", {
              dominant: TRAIL_VALUE_LABELS[dominant.value],
              support1: TRAIL_VALUE_LABELS[ranked[1].value],
              support2: TRAIL_VALUE_LABELS[ranked[2].value],
              weakest: TRAIL_VALUE_LABELS[ranked[5].value],
            })}
          </p>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground italic text-center">
        {t("disclaimer")}
      </p>
    </div>
  );
}
