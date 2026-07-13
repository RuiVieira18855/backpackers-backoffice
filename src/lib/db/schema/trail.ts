import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { profiles } from "./foundations";

/**
 * TRAIL — Backpackers Labs' own team-values assessment.
 *
 * 6 axes derived from the TRILHA values (Transformação, Respeito, Inovação,
 * Liberdade, Harmonia, Aventura). 42-question Likert 1-5 self-report; scoring
 * normalises to 0-100 per axis. No licensing costs, no external certification.
 */

export const trailValueEnum = pgEnum("trail_value", [
  "T",
  "R",
  "I",
  "L",
  "H",
  "A",
]);

export const trailStatusEnum = pgEnum("trail_status", [
  "in_progress",
  "completed",
  "abandoned",
]);

// Question bank — maintained via seed script; edits by super_user only.
export const trailQuestions = pgTable(
  "trail_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    value: trailValueEnum("value").notNull(),
    statement: text("statement").notNull(),
    reverseScored: boolean("reverse_scored").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("trail_questions_code_idx").on(t.code),
    index("trail_questions_value_idx").on(t.value, t.sortOrder),
  ],
);

// One row per assessment run. Scores are null until status = completed.
export const trailAssessments = pgTable(
  "trail_assessments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    status: trailStatusEnum("status").notNull().default("in_progress"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    scoreT: integer("score_t"),
    scoreR: integer("score_r"),
    scoreI: integer("score_i"),
    scoreL: integer("score_l"),
    scoreH: integer("score_h"),
    scoreA: integer("score_a"),
    dominant: text("dominant"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("trail_assessments_user_idx").on(t.userId),
    index("trail_assessments_status_idx").on(t.status),
    index("trail_assessments_completed_at_idx").on(t.completedAt.desc()),
  ],
);

// Individual answers. One row per (assessment, question). Likert 1-5.
export const trailAnswers = pgTable(
  "trail_answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => trailAssessments.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => trailQuestions.id, { onDelete: "restrict" }),
    likert: integer("likert").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("trail_answers_assessment_idx").on(t.assessmentId),
    index("trail_answers_question_idx").on(t.questionId),
  ],
);

export const trailAssessmentsRelations = relations(
  trailAssessments,
  ({ one, many }) => ({
    user: one(profiles, {
      fields: [trailAssessments.userId],
      references: [profiles.id],
    }),
    answers: many(trailAnswers),
  }),
);

export const trailAnswersRelations = relations(trailAnswers, ({ one }) => ({
  assessment: one(trailAssessments, {
    fields: [trailAnswers.assessmentId],
    references: [trailAssessments.id],
  }),
  question: one(trailQuestions, {
    fields: [trailAnswers.questionId],
    references: [trailQuestions.id],
  }),
}));

export type TrailQuestion = typeof trailQuestions.$inferSelect;
export type TrailAssessment = typeof trailAssessments.$inferSelect;
export type TrailAnswer = typeof trailAnswers.$inferSelect;
export type TrailValueKey = "T" | "R" | "I" | "L" | "H" | "A";

// Convenience: SQL for casting a text into the enum.
export const TRAIL_VALUE_KEYS: TrailValueKey[] = ["T", "R", "I", "L", "H", "A"];
export const TRAIL_VALUE_LABELS: Record<TrailValueKey, string> = {
  T: "Transformação",
  R: "Respeito",
  I: "Inovação",
  L: "Liberdade",
  H: "Harmonia",
  A: "Aventura",
};
export { sql };
