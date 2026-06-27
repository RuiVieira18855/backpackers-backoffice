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

// ---------- Enums ----------

/**
 * User role hierarchy (top → bottom):
 * - super_user  : full access; protected — only super_user can demote super_user,
 *                 and the LAST super_user can never be demoted (lockout safe)
 * - admin_grupo : full access across all pilares (delegated admin)
 * - admin_pilar : full access within their assigned pilar(es)
 * - member      : limited access within their assigned pilar(es)
 */
export const userRoleEnum = pgEnum("user_role", [
  "super_user",
  "admin_grupo",
  "admin_pilar",
  "member",
]);

/**
 * Distinguishes Backpackers team members (internal) from external customers
 * who only signed up to use a Backpackers SaaS app (e.g. Cairn Pro).
 * Customers may still have a row in profiles + a row in app_access without
 * any backoffice skills.
 */
export const userKindEnum = pgEnum("user_kind", ["internal", "customer"]);

export const auditActionEnum = pgEnum("audit_action", [
  "create",
  "update",
  "delete",
]);

// ---------- Pillars ----------

/**
 * Lookup table for the 4 pilares of the Backpackers group.
 * Seeded once via bootstrap.sql with: adventures, synergy, labs, grupo.
 */
export const pillars = pgTable("pillars", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ---------- Profiles ----------

/**
 * 1:1 with auth.users (Supabase Auth managed). FK to auth.users(id) is
 * added by bootstrap.sql since Drizzle does not see the auth schema.
 *
 * `pillar_access` is a uuid array — list of pillar.id this user can see.
 * `default_pillar_id` is the landing pilar after login.
 */
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  role: userRoleEnum("role").notNull().default("member"),
  kind: userKindEnum("kind").notNull().default("internal"),
  skills: text("skills")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  pillarAccess: uuid("pillar_access")
    .array()
    .notNull()
    .default(sql`'{}'::uuid[]`),
  defaultPillarId: uuid("default_pillar_id").references(() => pillars.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ---------- Audit log ----------

/**
 * Append-only trail. No app writes UPDATE/DELETE — bootstrap.sql
 * sets RLS to enforce this.
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    pillarId: uuid("pillar_id").references(() => pillars.id, {
      onDelete: "set null",
    }),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    action: auditActionEnum("action").notNull(),
    diff: jsonb("diff"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("audit_log_pillar_idx").on(table.pillarId),
    index("audit_log_entity_idx").on(table.entityType, table.entityId),
    index("audit_log_user_idx").on(table.userId),
    index("audit_log_created_at_idx").on(table.createdAt.desc()),
  ],
);

// ---------- Relations ----------

export const profilesRelations = relations(profiles, ({ one }) => ({
  defaultPillar: one(pillars, {
    fields: [profiles.defaultPillarId],
    references: [pillars.id],
  }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  user: one(profiles, {
    fields: [auditLog.userId],
    references: [profiles.id],
  }),
  pillar: one(pillars, {
    fields: [auditLog.pillarId],
    references: [pillars.id],
  }),
}));
