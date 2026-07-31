import { sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { profiles } from "./foundations";

export const siteEventStatusEnum = pgEnum("site_event_status", [
  "draft",
  "published",
  "archived",
]);

// Espelha EventType em web/src/types/event.ts.
export const siteEventTypeEnum = pgEnum("site_event_type", [
  "adventure",
  "synergy-open",
  "workshop",
  "retreat",
]);

/**
 * Agenda pública do site (caminhadas, workshops, retiros), autorada em Outpost
 * e renderizada por web/src/app/eventos.
 *
 * NÃO confundir com `events` (./ops.ts), que é o calendário interno de ops.
 * Esta tabela é conteúdo de marketing: sem recorrência, sem tenant, admin_grupo+
 * escreve, anon lê publicados e arquivados.
 *
 * `startsAt` a null significa data por confirmar; nesse caso `plannedMonth`
 * ("YYYY-MM") é o que o site mostra.
 */
export const siteEvents = pgTable(
  "site_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(sql`''`),
    description: text("description").notNull().default(sql`''`),

    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    plannedMonth: text("planned_month"),

    type: siteEventTypeEnum("type").notNull().default("adventure"),
    location: text("location").notNull().default(sql`''`),
    region: text("region"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    meetingPoint: text("meeting_point"),
    distance: text("distance"),
    difficulty: smallint("difficulty"),
    price: integer("price").notNull().default(0),
    maxParticipants: integer("max_participants").notNull().default(0),

    coverImage: text("cover_image"),
    images: text("images").array().notNull().default(sql`'{}'`),
    included: text("included").array().notNull().default(sql`'{}'`),
    requirements: text("requirements").array().notNull().default(sql`'{}'`),
    featured: boolean("featured").notNull().default(false),

    status: siteEventStatusEnum("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),

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
    uniqueIndex("site_events_slug_idx").on(t.slug),
    index("site_events_status_starts_idx").on(t.status, t.startsAt),
    index("site_events_type_idx").on(t.type),
  ],
);

export const siteEventsRelations = relations(siteEvents, ({ one }) => ({
  createdByProfile: one(profiles, {
    fields: [siteEvents.createdBy],
    references: [profiles.id],
    relationName: "site_event_created_by",
  }),
  updatedByProfile: one(profiles, {
    fields: [siteEvents.updatedBy],
    references: [profiles.id],
    relationName: "site_event_updated_by",
  }),
}));

export type SiteEventRow = typeof siteEvents.$inferSelect;
export type NewSiteEventRow = typeof siteEvents.$inferInsert;
