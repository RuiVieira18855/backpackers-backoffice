import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { profiles, pillars } from "./foundations";

export const aiUsage = pgTable(
  "ai_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    pillarId: uuid("pillar_id").references(() => pillars.id, {
      onDelete: "set null",
    }),
    app: text("app").notNull().default("outpost"),
    surface: text("surface").notNull(),
    entityType: text("entity_type"),
    entityId: uuid("entity_id"),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    latencyMs: integer("latency_ms").notNull().default(0),
    ok: text("ok").notNull().default("true"),
    errorCode: text("error_code"),
    meta: jsonb("meta"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("ai_usage_user_idx").on(table.userId),
    index("ai_usage_surface_idx").on(table.surface),
    index("ai_usage_created_at_idx").on(table.createdAt.desc()),
    index("ai_usage_entity_idx").on(table.entityType, table.entityId),
  ],
);
