import { sql, relations } from "drizzle-orm";
import {
  date,
  decimal,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { pillars, profiles } from "./foundations";
import { contacts } from "./crm";

export const dealStageEnum = pgEnum("deal_stage", [
  "lead",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
]);

export const deals = pgTable(
  "deals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pillarId: uuid("pillar_id")
      .notNull()
      .references(() => pillars.id, { onDelete: "restrict" }),
    contactId: uuid("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    ownerId: uuid("owner_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    description: text("description"),
    stage: dealStageEnum("stage").notNull().default("lead"),
    value: decimal("value", { precision: 12, scale: 2 }),
    currency: text("currency").notNull().default("EUR"),
    expectedCloseDate: date("expected_close_date"),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("deals_pillar_idx").on(t.pillarId),
    index("deals_stage_idx").on(t.stage),
    index("deals_contact_idx").on(t.contactId),
    index("deals_owner_idx").on(t.ownerId),
    index("deals_close_idx").on(t.expectedCloseDate),
    index("deals_created_at_idx").on(t.createdAt.desc()),
  ],
);

export const dealsRelations = relations(deals, ({ one }) => ({
  pillar: one(pillars, {
    fields: [deals.pillarId],
    references: [pillars.id],
  }),
  contact: one(contacts, {
    fields: [deals.contactId],
    references: [contacts.id],
  }),
  owner: one(profiles, {
    fields: [deals.ownerId],
    references: [profiles.id],
  }),
}));

export type Deal = typeof deals.$inferSelect;
export type NewDeal = typeof deals.$inferInsert;
