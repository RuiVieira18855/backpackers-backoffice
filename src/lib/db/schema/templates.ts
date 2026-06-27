import { sql, relations } from "drizzle-orm";
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { pillars, profiles } from "./foundations";

export const templateScopeEnum = pgEnum("template_scope", [
  "contact_note",
  "event_description",
  "project_description",
  "deal_description",
  "task_description",
  "doc_description",
  "generic",
]);

/**
 * Reusable text snippets users can insert into notes / descriptions.
 *
 * - `pillar_id` nullable = available to all pillars
 * - `scope` decides which forms surface the template picker
 * - `body` supports basic placeholders like {{name}} that the picker
 *   substitutes from form context (kept simple — no expressions)
 */
export const templates = pgTable(
  "templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pillarId: uuid("pillar_id").references(() => pillars.id, {
      onDelete: "set null",
    }),
    scope: templateScopeEnum("scope").notNull().default("generic"),
    name: text("name").notNull(),
    body: text("body").notNull(),
    createdBy: uuid("created_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("templates_scope_idx").on(t.scope),
    index("templates_pillar_idx").on(t.pillarId),
    index("templates_name_idx").on(t.name),
  ],
);

export const templatesRelations = relations(templates, ({ one }) => ({
  pillar: one(pillars, {
    fields: [templates.pillarId],
    references: [pillars.id],
  }),
  createdByProfile: one(profiles, {
    fields: [templates.createdBy],
    references: [profiles.id],
  }),
}));

export type Template = typeof templates.$inferSelect;
export type NewTemplate = typeof templates.$inferInsert;
