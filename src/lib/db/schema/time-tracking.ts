import { relations } from "drizzle-orm";
import {
  date,
  decimal,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { pillars, profiles } from "./foundations";
import { projects, tasks } from "./ops";

/**
 * Hours logged against a project (and optionally a specific task).
 * MVP: manual entry, no in-app timer. `pillar_id` is denormalised for
 * fast rollups and RLS parity with other entities.
 */
export const timeEntries = pgTable(
  "time_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    taskId: uuid("task_id").references(() => tasks.id, {
      onDelete: "set null",
    }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    pillarId: uuid("pillar_id").references(() => pillars.id, {
      onDelete: "set null",
    }),
    hours: decimal("hours", { precision: 6, scale: 2 }).notNull(),
    description: text("description"),
    date: date("date").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("time_entries_project_idx").on(t.projectId),
    index("time_entries_task_idx").on(t.taskId),
    index("time_entries_user_idx").on(t.userId),
    index("time_entries_date_idx").on(t.date.desc()),
  ],
);

export const timeEntriesRelations = relations(timeEntries, ({ one }) => ({
  project: one(projects, {
    fields: [timeEntries.projectId],
    references: [projects.id],
  }),
  task: one(tasks, {
    fields: [timeEntries.taskId],
    references: [tasks.id],
  }),
  user: one(profiles, {
    fields: [timeEntries.userId],
    references: [profiles.id],
  }),
  pillar: one(pillars, {
    fields: [timeEntries.pillarId],
    references: [pillars.id],
  }),
}));

export type TimeEntry = typeof timeEntries.$inferSelect;
export type NewTimeEntry = typeof timeEntries.$inferInsert;
