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

export const notificationKindEnum = pgEnum("notification_kind", [
  "task_assigned",
  "task_due_soon",
  "event_finance",
  "event_doc",
  "project_finance",
  "project_doc",
  "mention",
  "system",
]);

/**
 * Per-user notification feed.
 *
 * - `user_id` is the RECIPIENT, RLS so each user sees only their own
 * - `link` is an in-app path (e.g. /ops/tasks/<id>); no external URLs
 * - `read_at` null = unread
 * - `pillar_id` optional, useful for analytics/filtering
 */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    pillarId: uuid("pillar_id").references(() => pillars.id, {
      onDelete: "set null",
    }),
    kind: notificationKindEnum("kind").notNull().default("system"),
    title: text("title").notNull(),
    body: text("body"),
    link: text("link"),
    actorId: uuid("actor_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("notifications_user_idx").on(t.userId, t.createdAt.desc()),
    index("notifications_user_unread_idx")
      .on(t.userId)
      .where(sql`${t.readAt} IS NULL`),
  ],
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(profiles, {
    fields: [notifications.userId],
    references: [profiles.id],
    relationName: "notifications_user",
  }),
  actor: one(profiles, {
    fields: [notifications.actorId],
    references: [profiles.id],
    relationName: "notifications_actor",
  }),
  pillar: one(pillars, {
    fields: [notifications.pillarId],
    references: [pillars.id],
  }),
}));

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
