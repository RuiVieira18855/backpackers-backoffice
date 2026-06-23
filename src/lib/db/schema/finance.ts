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
import { events, projects } from "./ops";

// ---------- Enums ----------

export const transactionTypeEnum = pgEnum("transaction_type", [
  "income",
  "expense",
]);

export const transactionStatusEnum = pgEnum("transaction_status", [
  "pending",
  "paid",
  "overdue",
  "cancelled",
]);

// ---------- Transactions ----------

/**
 * Single ledger of money in / money out. Accessible only to super_user
 * (enforced by RLS in supabase/07_finance.sql).
 *
 * - `amount` is always positive (use `type` to know sign)
 * - `pillar_id` nullable: grupo-level transactions (rent, accountant, etc.)
 * - `category` is free-text so user can adapt without migrations
 * - `paid_at` filled when status -> paid (auto via server action)
 */
export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pillarId: uuid("pillar_id").references(() => pillars.id, {
      onDelete: "set null",
    }),
    eventId: uuid("event_id").references(() => events.id, {
      onDelete: "set null",
    }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    type: transactionTypeEnum("type").notNull(),
    category: text("category"),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("EUR"),
    description: text("description").notNull(),
    date: date("date").notNull(),
    invoiceNumber: text("invoice_number"),
    vendor: text("vendor"),
    status: transactionStatusEnum("status").notNull().default("pending"),
    dueDate: date("due_date"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    notes: text("notes"),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
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
    index("transactions_pillar_idx").on(t.pillarId),
    index("transactions_event_idx").on(t.eventId),
    index("transactions_project_idx").on(t.projectId),
    index("transactions_type_idx").on(t.type),
    index("transactions_status_idx").on(t.status),
    index("transactions_date_idx").on(t.date.desc()),
    index("transactions_due_date_idx").on(t.dueDate),
    index("transactions_created_by_idx").on(t.createdBy),
  ],
);

export const transactionsRelations = relations(transactions, ({ one }) => ({
  pillar: one(pillars, {
    fields: [transactions.pillarId],
    references: [pillars.id],
  }),
  event: one(events, {
    fields: [transactions.eventId],
    references: [events.id],
  }),
  project: one(projects, {
    fields: [transactions.projectId],
    references: [projects.id],
  }),
  createdByProfile: one(profiles, {
    fields: [transactions.createdBy],
    references: [profiles.id],
  }),
}));

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
