"use server";

import { revalidatePath } from "next/cache";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  trailAnswers,
  trailAssessments,
  trailQuestions,
  TRAIL_VALUE_KEYS,
  type TrailValueKey,
} from "@/lib/db/schema";
import { requireProfile, requireRole } from "@/lib/dal";
import { computeScores, dominantValue } from "@backpackers/trail-core/scoring";
import { TRAIL_QUESTIONS } from "@backpackers/trail-core/questions";

// ---------- Seed (super_user + admin_grupo) --------------------------------

export type TrailSeedResult =
  | { ok: true; inserted: number; updated: number }
  | { ok: false; error: string };

export async function seedTrailQuestions(): Promise<TrailSeedResult> {
  await requireRole("admin_grupo");
  let inserted = 0;
  let updated = 0;
  try {
    for (const q of TRAIL_QUESTIONS) {
      const existing = await db.query.trailQuestions.findFirst({
        where: eq(trailQuestions.code, q.code),
      });
      if (existing) {
        await db
          .update(trailQuestions)
          .set({
            value: q.value,
            statement: q.statement,
            reverseScored: q.reverseScored,
            sortOrder: q.sortOrder,
            isActive: true,
          })
          .where(eq(trailQuestions.code, q.code));
        updated++;
      } else {
        await db.insert(trailQuestions).values(q);
        inserted++;
      }
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  revalidatePath("/trail");
  return { ok: true, inserted, updated };
}

// ---------- User flow ------------------------------------------------------

export type StartResult =
  | { ok: true; assessmentId: string }
  | { ok: false; error: string };

export async function startAssessment(): Promise<StartResult> {
  const profile = await requireProfile();
  try {
    const [row] = await db
      .insert(trailAssessments)
      .values({ userId: profile.id })
      .returning();
    revalidatePath("/trail");
    return { ok: true, assessmentId: row.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export type SubmitBatchInput = {
  assessmentId: string;
  answers: Array<{ questionId: string; likert: number }>;
};

export type SubmitResult = { ok: true } | { ok: false; error: string };

export async function submitAnswerBatch(
  input: SubmitBatchInput,
): Promise<SubmitResult> {
  const profile = await requireProfile();
  const assessment = await db.query.trailAssessments.findFirst({
    where: eq(trailAssessments.id, input.assessmentId),
  });
  if (!assessment) return { ok: false, error: "Assessment not found" };
  if (assessment.userId !== profile.id) {
    return { ok: false, error: "Not your assessment" };
  }

  for (const a of input.answers) {
    if (a.likert < 1 || a.likert > 5) {
      return { ok: false, error: `Invalid likert: ${a.likert}` };
    }
  }

  try {
    for (const a of input.answers) {
      const existing = await db.query.trailAnswers.findFirst({
        where: and(
          eq(trailAnswers.assessmentId, input.assessmentId),
          eq(trailAnswers.questionId, a.questionId),
        ),
      });
      if (existing) {
        await db
          .update(trailAnswers)
          .set({ likert: a.likert })
          .where(eq(trailAnswers.id, existing.id));
      } else {
        await db.insert(trailAnswers).values({
          assessmentId: input.assessmentId,
          questionId: a.questionId,
          likert: a.likert,
        });
      }
    }
    await db
      .update(trailAssessments)
      .set({ updatedAt: new Date() })
      .where(eq(trailAssessments.id, input.assessmentId));
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  return { ok: true };
}

export type FinishResult =
  | { ok: true; assessmentId: string }
  | { ok: false; error: string };

export async function finishAssessment(
  assessmentId: string,
): Promise<FinishResult> {
  const profile = await requireProfile();
  const assessment = await db.query.trailAssessments.findFirst({
    where: eq(trailAssessments.id, assessmentId),
  });
  if (!assessment) return { ok: false, error: "Not found" };
  if (assessment.userId !== profile.id) {
    return { ok: false, error: "Not your assessment" };
  }

  const answers = await db
    .select({
      likert: trailAnswers.likert,
      value: trailQuestions.value,
      reverseScored: trailQuestions.reverseScored,
    })
    .from(trailAnswers)
    .innerJoin(trailQuestions, eq(trailAnswers.questionId, trailQuestions.id))
    .where(eq(trailAnswers.assessmentId, assessmentId));

  if (answers.length < TRAIL_QUESTIONS.length) {
    return {
      ok: false,
      error: `Faltam respostas: ${TRAIL_QUESTIONS.length - answers.length} de ${TRAIL_QUESTIONS.length}.`,
    };
  }

  const scores = computeScores(
    answers.map((a) => ({
      value: a.value as TrailValueKey,
      likert: a.likert,
      reverseScored: a.reverseScored,
    })),
  );
  const dominant = dominantValue(scores);

  await db
    .update(trailAssessments)
    .set({
      status: "completed",
      completedAt: new Date(),
      updatedAt: new Date(),
      scoreT: scores.T,
      scoreR: scores.R,
      scoreI: scores.I,
      scoreL: scores.L,
      scoreH: scores.H,
      scoreA: scores.A,
      dominant,
    })
    .where(eq(trailAssessments.id, assessmentId));

  revalidatePath("/trail");
  revalidatePath(`/trail/${assessmentId}`);
  return { ok: true, assessmentId };
}

export async function abandonAssessment(
  assessmentId: string,
): Promise<SubmitResult> {
  const profile = await requireProfile();
  const assessment = await db.query.trailAssessments.findFirst({
    where: eq(trailAssessments.id, assessmentId),
  });
  if (!assessment) return { ok: false, error: "Not found" };
  if (assessment.userId !== profile.id) {
    return { ok: false, error: "Not your assessment" };
  }
  await db
    .update(trailAssessments)
    .set({ status: "abandoned", updatedAt: new Date() })
    .where(eq(trailAssessments.id, assessmentId));
  revalidatePath("/trail");
  return { ok: true };
}

// Utility used by pages
void TRAIL_VALUE_KEYS;
void inArray;
void asc;
void desc;
