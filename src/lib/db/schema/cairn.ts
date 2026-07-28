import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { profiles } from "./foundations";

/**
 * Customer feedback submitted from inside Cairn (the floating widget).
 * Written by the app with the user's JWT (RLS: insert own); read here by
 * admins for the Outpost feedback view. Cairn-owned data living in the shared
 * database — the Outpost only reads it.
 */
export const cairnFeedback = pgTable(
  "cairn_feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    email: text("email"),
    app: text("app").notNull().default("cairn"),
    kind: text("kind"), // bug | idea | other
    message: text("message").notNull(),
    rating: integer("rating"), // 1..5, optional
    url: text("url"),
    ua: text("ua"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("cairn_feedback_created_idx").on(t.createdAt.desc()),
    index("cairn_feedback_kind_idx").on(t.kind),
  ],
);

export type CairnFeedback = typeof cairnFeedback.$inferSelect;
export type NewCairnFeedback = typeof cairnFeedback.$inferInsert;
