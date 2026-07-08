import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { profiles } from "./foundations";

/**
 * Automation workflows. Each row is a definition:
 *   trigger → conditions (AND-combined) → actions (in order).
 *
 * conditions + actions are JSONB — the shape is enforced in
 * lib/workflows.ts via TypeScript types. Keeping them JSONB lets us
 * evolve the vocabulary without new migrations for every trigger/action.
 */
export const workflows = pgTable(
  "workflows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
    triggerType: text("trigger_type").notNull(),
    conditions: jsonb("conditions").notNull().default(sql`'[]'::jsonb`),
    actions: jsonb("actions").notNull().default(sql`'[]'::jsonb`),
    isActive: boolean("is_active").notNull().default(true),
    createdBy: uuid("created_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("workflows_trigger_active_idx").on(t.triggerType)],
);

export const workflowsRelations = relations(workflows, ({ one }) => ({
  createdByProfile: one(profiles, {
    fields: [workflows.createdBy],
    references: [profiles.id],
  }),
}));

export type Workflow = typeof workflows.$inferSelect;
export type NewWorkflow = typeof workflows.$inferInsert;
