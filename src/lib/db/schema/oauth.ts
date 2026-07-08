import { relations } from "drizzle-orm";
import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { pillars, profiles } from "./foundations";

export const oauthProviderEnum = pgEnum("oauth_provider", [
  "google",
  "microsoft",
]);

/**
 * OAuth 2.0 connection to an external calendar provider (Google, Microsoft).
 *
 * - One row per (user, provider) — uniqueness enforced.
 * - Tokens stored in plaintext; PII risk is fenced by RLS + service role in
 *   admin ops. Wrap in pgcrypto in a follow-up if we host multi-tenant.
 */
export const oauthConnections = pgTable(
  "oauth_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    provider: oauthProviderEnum("provider").notNull(),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    scope: text("scope"),
    externalEmail: text("external_email"),
    defaultPillarId: uuid("default_pillar_id").references(() => pillars.id, {
      onDelete: "set null",
    }),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [uniqueIndex("oauth_connections_user_provider_idx").on(t.userId, t.provider)],
);

export const oauthConnectionsRelations = relations(
  oauthConnections,
  ({ one }) => ({
    user: one(profiles, {
      fields: [oauthConnections.userId],
      references: [profiles.id],
    }),
    defaultPillar: one(pillars, {
      fields: [oauthConnections.defaultPillarId],
      references: [pillars.id],
    }),
  }),
);

export type OAuthConnection = typeof oauthConnections.$inferSelect;
export type NewOAuthConnection = typeof oauthConnections.$inferInsert;
