import { sql, relations } from "drizzle-orm";
import {
  bigint,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { pillars, profiles } from "./foundations";

export const documentTypeEnum = pgEnum("document_type", [
  "procedure",
  "contract",
  "report",
  "portfolio",
  "other",
]);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pillarId: uuid("pillar_id")
      .notNull()
      .references(() => pillars.id, { onDelete: "restrict" }),
    type: documentTypeEnum("type").notNull().default("other"),
    title: text("title").notNull(),
    description: text("description"),
    storagePath: text("storage_path").notNull(),
    fileName: text("file_name").notNull(),
    fileSize: bigint("file_size", { mode: "number" }),
    mimeType: text("mime_type"),
    uploadedBy: uuid("uploaded_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("documents_pillar_idx").on(t.pillarId),
    index("documents_type_idx").on(t.type),
    index("documents_uploaded_by_idx").on(t.uploadedBy),
    index("documents_created_at_idx").on(t.createdAt.desc()),
  ],
);

export const documentsRelations = relations(documents, ({ one }) => ({
  pillar: one(pillars, {
    fields: [documents.pillarId],
    references: [pillars.id],
  }),
  uploadedByProfile: one(profiles, {
    fields: [documents.uploadedBy],
    references: [profiles.id],
  }),
}));

export type DocumentRow = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
