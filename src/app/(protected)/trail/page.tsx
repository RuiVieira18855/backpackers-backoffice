import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { Compass, Play, TrendingUp } from "lucide-react";
import { db } from "@/lib/db";
import { trailAssessments, trailQuestions } from "@/lib/db/schema";
import { requireProfile } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StartAssessmentButton } from "./start-button";
import { SeedTrailQuestionsButton } from "./seed-button";

export default async function TrailLandingPage() {
  const profile = await requireProfile();
  const t = await getTranslations("trail");

  const [questionCount, myAssessments] = await Promise.all([
    db
      .select({ count: trailQuestions.id })
      .from(trailQuestions)
      .then((r) => r.length),
    db
      .select()
      .from(trailAssessments)
      .where(eq(trailAssessments.userId, profile.id))
      .orderBy(desc(trailAssessments.startedAt))
      .limit(10),
  ]);

  const inProgress = myAssessments.find((a) => a.status === "in_progress");
  const completed = myAssessments.filter((a) => a.status === "completed");
  const canSeed =
    profile.role === "super_user" || profile.role === "admin_grupo";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 space-y-8">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
          {t("kicker")}
        </p>
        <h1 className="font-display text-4xl sm:text-6xl text-foreground leading-none">
          {t("title")}
        </h1>
        <p className="mt-3 text-base text-muted-foreground max-w-2xl">
          {t("subtitle")}
        </p>
      </div>

      {questionCount === 0 ? (
        <Card>
          <CardContent className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground">{t("noQuestions")}</p>
            {canSeed && <SeedTrailQuestionsButton />}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-accent/40 bg-accent/5">
            <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/40 text-accent-foreground shrink-0">
                <Compass className="h-5 w-5" />
              </div>
              <div className="flex-1 space-y-1">
                <h2 className="text-lg font-medium text-foreground">
                  {inProgress ? t("resume.title") : t("start.title")}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {inProgress ? t("resume.subtitle") : t("start.subtitle")}
                </p>
              </div>
              {inProgress ? (
                <Button asChild>
                  <Link href={`/trail/take?a=${inProgress.id}`}>
                    <Play className="mr-2 h-4 w-4" />
                    {t("resume.cta")}
                  </Link>
                </Button>
              ) : (
                <StartAssessmentButton />
              )}
            </CardContent>
          </Card>

          {completed.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-medium text-foreground">
                {t("history.title")}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {completed.map((a) => (
                  <Link
                    key={a.id}
                    href={`/trail/${a.id}`}
                    className="block group"
                  >
                    <Card className="transition-colors group-hover:border-accent">
                      <CardContent className="p-4 flex items-center gap-3">
                        <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {a.completedAt
                              ? new Intl.DateTimeFormat("pt-PT", {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                }).format(a.completedAt)
                              : "—"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {t("history.dominant", {
                              value: a.dominant ?? "—",
                            })}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {completed.length === 0 && !inProgress && (
            <EmptyState
              title={t("empty.title")}
              description={t("empty.subtitle")}
            />
          )}
        </>
      )}
    </div>
  );
}
