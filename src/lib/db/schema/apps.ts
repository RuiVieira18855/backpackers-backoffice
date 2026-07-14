import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { profiles } from "./foundations";

/**
 * Catalog of Backpackers apps that can have access granted/revoked.
 * Managed at /admin/apps. The `key` is the foreign reference used by
 * appAccess.app (kept as text for backward compatibility).
 */
export const apps = pgTable("apps", {
  key: text("key").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"),
  url: text("url"),
  color: text("color"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type App = typeof apps.$inferSelect;
export type NewApp = typeof apps.$inferInsert;

export const appAccessStatusEnum = pgEnum("app_access_status", [
  "trial",
  "active",
  "expired",
  "revoked",
]);

/**
 * Entitlements: who may use which Backpackers app (e.g. Cairn Pro).
 * Managed from /admin/apps; enforced by the app's login gate and the AI proxy.
 * - (user_id, app) is unique
 * - status drives access; expires_at optionally bounds it
 */
export const appAccess = pgTable(
  "app_access",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    app: text("app").notNull().default("cairn"),
    status: appAccessStatusEnum("status").notNull().default("trial"),
    plan: text("plan"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    notes: text("notes"),
    branding: jsonb("branding").$type<{
      name?: string;
      mark?: string;
      tag?: string;
      link?: string;
      accent?: string;
    } | null>(),
    grantedBy: uuid("granted_by").references(() => profiles.id, {
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
    uniqueIndex("app_access_user_app_idx").on(t.userId, t.app),
    index("app_access_app_idx").on(t.app, t.status),
  ],
);

export const appAccessRelations = relations(appAccess, ({ one }) => ({
  user: one(profiles, {
    fields: [appAccess.userId],
    references: [profiles.id],
  }),
}));

export type AppAccess = typeof appAccess.$inferSelect;
export type NewAppAccess = typeof appAccess.$inferInsert;
