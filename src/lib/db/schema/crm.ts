import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { pillars, profiles } from "./foundations";

// ---------- Enums ----------

export const contactTypeEnum = pgEnum("contact_type", [
  "lead",
  "customer",
  "partner",
  "vendor",
]);

export const contactStageEnum = pgEnum("contact_stage", [
  "new",
  "qualified",
  "active",
  "on_hold",
  "closed_won",
  "closed_lost",
]);

export const contactSourceEnum = pgEnum("contact_source", [
  "website",
  "referral",
  "event",
  "inbound",
  "cold",
  "other",
]);

// ---------- Contacts ----------

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pillarId: uuid("pillar_id")
      .notNull()
      .references(() => pillars.id, { onDelete: "restrict" }),
    type: contactTypeEnum("type").notNull().default("lead"),
    stage: contactStageEnum("stage").notNull().default("new"),
    fullName: text("full_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    company: text("company"),
    jobTitle: text("job_title"),
    notes: text("notes"),
    source: contactSourceEnum("source"),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    ownerId: uuid("owner_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    nextAction: text("next_action"),
    nextActionAt: timestamp("next_action_at", { withTimezone: true }),
    lastContactAt: timestamp("last_contact_at", { withTimezone: true }),
    customFields: jsonb("custom_fields")
      .notNull()
      .default(sql`'{}'::jsonb`)
      .$type<Record<string, string | number | null>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("contacts_pillar_idx").on(table.pillarId),
    index("contacts_stage_idx").on(table.stage),
    index("contacts_type_idx").on(table.type),
    index("contacts_owner_idx").on(table.ownerId),
    index("contacts_full_name_idx").on(table.fullName),
    index("contacts_created_at_idx").on(table.createdAt.desc()),
  ],
);

export const contactsRelations = relations(contacts, ({ one }) => ({
  pillar: one(pillars, {
    fields: [contacts.pillarId],
    references: [pillars.id],
  }),
  owner: one(profiles, {
    fields: [contacts.ownerId],
    references: [profiles.id],
  }),
}));

// ---------- Types ----------

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
