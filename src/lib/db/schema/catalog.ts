import { sql } from "drizzle-orm";
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
import { relations } from "drizzle-orm";
import { pillars, profiles } from "./foundations";

export const catalogFamilyEnum = pgEnum("catalog_family", [
  "wild",
  "hive",
  "multi",
]);

/**
 * Central catalog of Backpackers activities — the reusable operational
 * knowledge base. Super users maintain it; all authenticated users read it.
 *
 * The markdown body carries the full operational guide (objective, flow,
 * equipment, briefing, follow-up, risks). Structured columns support
 * filtering, pricing lookups from deals, and copilot suggestions.
 */
export const catalogActivities = pgTable(
  "catalog_activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    tagline: text("tagline"),
    family: catalogFamilyEnum("family").notNull(),
    pillarId: uuid("pillar_id").references(() => pillars.id, {
      onDelete: "set null",
    }),
    durationLabel: text("duration_label"),
    paxMin: integer("pax_min"),
    paxMax: integer("pax_max"),
    priceTargetMin: integer("price_target_min"),
    priceTargetMax: integer("price_target_max"),
    pricePerPaxMin: integer("price_per_pax_min"),
    pricePerPaxMax: integer("price_per_pax_max"),
    targetAudience: text("target_audience"),
    body: text("body")
      .notNull()
      .default(sql`''`),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdBy: uuid("created_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
    updatedBy: uuid("updated_by").references(() => profiles.id, {
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
    uniqueIndex("catalog_activities_code_idx").on(t.code),
    index("catalog_activities_family_idx").on(t.family, t.sortOrder),
    index("catalog_activities_active_idx").on(t.isActive),
  ],
);

export const catalogActivitiesRelations = relations(
  catalogActivities,
  ({ one }) => ({
    pillar: one(pillars, {
      fields: [catalogActivities.pillarId],
      references: [pillars.id],
    }),
    createdByProfile: one(profiles, {
      fields: [catalogActivities.createdBy],
      references: [profiles.id],
      relationName: "activity_created_by",
    }),
    updatedByProfile: one(profiles, {
      fields: [catalogActivities.updatedBy],
      references: [profiles.id],
      relationName: "activity_updated_by",
    }),
  }),
);

export type CatalogActivity = typeof catalogActivities.$inferSelect;
export type NewCatalogActivity = typeof catalogActivities.$inferInsert;
