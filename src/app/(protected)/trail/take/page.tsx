import { notFound, redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import {
  trailAnswers,
  trailAssessments,
  trailQuestions,
} from "@/lib/db/schema";
import { requireProfile } from "@/lib/dal";
import { TakeForm } from "./take-form";

type Props = { searchParams: Promise<{ a?: string }> };

export default async function TrailTakePage({ searchParams }: Props) {
  const profile = await requireProfile();
  const { a: id } = await searchParams;
  const t = await getTranslations("trail.take");

  if (!id) redirect("/trail");

  const assessment = await db.query.trailAssessments.findFirst({
    where: and(
      eq(trailAssessments.id, id),
      eq(trailAssessments.userId, profile.id),
    ),
  });
  if (!assessment) notFound();
  if (assessment.status === "completed") redirect(`/trail/${assessment.id}`);
  if (assessment.status === "abandoned") redirect("/trail");

  const questions = await db
    .select()
    .from(trailQuestions)
    .where(eq(trailQuestions.isActive, true))
    .orderBy(asc(trailQuestions.value), asc(trailQuestions.sortOrder));

  const existingAnswers = await db
    .select({
      questionId: trailAnswers.questionId,
      likert: trailAnswers.likert,
    })
    .from(trailAnswers)
    .where(eq(trailAnswers.assessmentId, assessment.id));

  const initialAnswers: Record<string, number> = {};
  for (const a of existingAnswers) initialAnswers[a.questionId] = a.likert;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
          {t("kicker")}
        </p>
        <h1 className="font-display text-3xl sm:text-4xl text-foreground leading-none">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("hint")}</p>
      </div>

      <TakeForm
        assessmentId={assessment.id}
        questions={questions.map((q) => ({
          id: q.id,
          statement: q.statement,
          value: q.value,
        }))}
        initialAnswers={initialAnswers}
      />
    </div>
  );
}
