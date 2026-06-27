import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import {
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { pillars, profiles } from "./foundations";
import { contacts } from "./crm";

// ---------- Enums ----------

export const eventTypeEnum = pgEnum("event_type", [
  "tour",
  "team_building",
  "workshop",
  "meeting",
  "retreat",
  "other",
]);

export const eventStatusEnum = pgEnum("event_status", [
  "draft",
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
]);

export const projectStatusEnum = pgEnum("project_status", [
  "planned",
  "active",
  "on_hold",
  "completed",
  "cancelled",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "todo",
  "doing",
  "blocked",
  "done",
]);

export const taskPriorityEnum = pgEnum("task_priority", [
  "low",
  "normal",
  "high",
  "urgent",
]);

// ---------- Events ----------

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pillarId: uuid("pillar_id")
      .notNull()
      .references(() => pillars.id, { onDelete: "restrict" }),
    type: eventTypeEnum("type").notNull().default("other"),
    status: eventStatusEnum("status").notNull().default("draft"),
    name: text("name").notNull(),
    description: text("description"),
    location: text("location"),
    startAt: timestamp("start_at", { withTimezone: true }),
    endAt: timestamp("end_at", { withTimezone: true }),
    capacity: integer("capacity"),
    attendeesCount: integer("attendees_count").notNull().default(0),
    clientContactId: uuid("client_contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    ownerId: uuid("owner_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    notes: text("notes"),
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
  (t) => [
    index("events_pillar_idx").on(t.pillarId),
    index("events_status_idx").on(t.status),
    index("events_type_idx").on(t.type),
    index("events_start_at_idx").on(t.startAt),
    index("events_owner_idx").on(t.ownerId),
    index("events_client_contact_idx").on(t.clientContactId),
  ],
);

// ---------- Projects ----------

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pillarId: uuid("pillar_id")
      .notNull()
      .references(() => pillars.id, { onDelete: "restrict" }),
    status: projectStatusEnum("status").notNull().default("planned"),
    name: text("name").notNull(),
    description: text("description"),
    clientContactId: uuid("client_contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    ownerId: uuid("owner_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    startDate: date("start_date"),
    targetDate: date("target_date"),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    notes: text("notes"),
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
  (t) => [
    index("projects_pillar_idx").on(t.pillarId),
    index("projects_status_idx").on(t.status),
    index("projects_owner_idx").on(t.ownerId),
    index("projects_target_date_idx").on(t.targetDate),
  ],
);

// ---------- Tasks ----------

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pillarId: uuid("pillar_id")
      .notNull()
      .references(() => pillars.id, { onDelete: "restrict" }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    eventId: uuid("event_id").references(() => events.id, {
      onDelete: "cascade",
    }),
    status: taskStatusEnum("status").notNull().default("todo"),
    priority: taskPriorityEnum("priority").notNull().default("normal"),
    title: text("title").notNull(),
    description: text("description"),
    assigneeId: uuid("assignee_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    dueDate: date("due_date"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("tasks_pillar_idx").on(t.pillarId),
    index("tasks_status_idx").on(t.status),
    index("tasks_project_idx").on(t.projectId),
    index("tasks_event_idx").on(t.eventId),
    index("tasks_assignee_idx").on(t.assigneeId),
    index("tasks_due_date_idx").on(t.dueDate),
  ],
);

// ---------- Relations ----------

export const eventsRelations = relations(events, ({ one, many }) => ({
  pillar: one(pillars, {
    fields: [events.pillarId],
    references: [pillars.id],
  }),
  owner: one(profiles, {
    fields: [events.ownerId],
    references: [profiles.id],
  }),
  clientContact: one(contacts, {
    fields: [events.clientContactId],
    references: [contacts.id],
  }),
  tasks: many(tasks),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  pillar: one(pillars, {
    fields: [projects.pillarId],
    references: [pillars.id],
  }),
  owner: one(profiles, {
    fields: [projects.ownerId],
    references: [profiles.id],
  }),
  clientContact: one(contacts, {
    fields: [projects.clientContactId],
    references: [contacts.id],
  }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  pillar: one(pillars, {
    fields: [tasks.pillarId],
    references: [pillars.id],
  }),
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  event: one(events, {
    fields: [tasks.eventId],
    references: [events.id],
  }),
  assignee: one(profiles, {
    fields: [tasks.assigneeId],
    references: [profiles.id],
  }),
}));

// ---------- Types ----------

export type EventRow = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type ProjectRow = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type TaskRow = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
