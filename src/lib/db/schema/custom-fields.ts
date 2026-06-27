import { sql, relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { profiles } from "./foundations";

export const customFieldEntityEnum = pgEnum("custom_field_entity", [
  "contact",
  "event",
  "project",
  "deal",
]);

export const customFieldTypeEnum = pgEnum("custom_field_type", [
  "text",
  "textarea",
  "number",
  "date",
  "select",
]);

/**
 * Admin-defined custom fields for domain entities.
 *
 * - (entity_type, key) is unique to avoid clashing keys
 * - `options` only meaningful for `type = 'select'`
 * - actual values live in each entity's `custom_fields` jsonb column
 */
export const customFieldDefs = pgTable(
  "custom_field_defs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityType: customFieldEntityEnum("entity_type").notNull(),
    key: text("key").notNull(),
    label: text("label").notNull(),
    type: customFieldTypeEnum("type").notNull().default("text"),
    options: text("options")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    required: boolean("required").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
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
  (t) => [
    uniqueIndex("custom_field_defs_entity_key_idx").on(t.entityType, t.key),
    index("custom_field_defs_entity_idx").on(t.entityType, t.sortOrder),
  ],
);

export const customFieldDefsRelations = relations(customFieldDefs, ({ one }) => ({
  createdByProfile: one(profiles, {
    fields: [customFieldDefs.createdBy],
    references: [profiles.id],
  }),
}));

export type CustomFieldDef = typeof customFieldDefs.$inferSelect;
export type NewCustomFieldDef = typeof customFieldDefs.$inferInsert;
