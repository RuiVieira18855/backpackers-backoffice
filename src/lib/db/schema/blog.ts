import { sql } from "drizzle-orm";
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { profiles } from "./foundations";

// Mirrors the pillar set the marketing site already uses in web/src/lib/blog.ts
// ("bwa" is the umbrella brand, not an operational pillar), so this is a blog
// enum of its own and NOT a FK to the operational `pillars` table.
export const blogPillarEnum = pgEnum("blog_pillar", [
  "bwa",
  "adventures",
  "synergy",
  "labs",
]);

export const blogStatusEnum = pgEnum("blog_status", ["draft", "published"]);

/**
 * Marketing blog posts, authored in Outpost and rendered by the public site
 * (web/src/app/blog). Content is plain Markdown. Brand-global content, so no
 * pillar FK and no tenant scoping. admin_grupo+ write; anon reads published.
 */
export const blogPosts = pgTable(
  "blog_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    excerpt: text("excerpt").notNull().default(sql`''`),
    content: text("content").notNull().default(sql`''`),
    pillar: blogPillarEnum("pillar").notNull().default("bwa"),
    category: text("category").notNull().default(sql`''`),
    author: text("author").notNull().default("Backpackers World Adventures"),
    coverImage: text("cover_image"),
    status: blogStatusEnum("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
    updatedBy: uuid("updated_by").references(() => profiles.id, {
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
    uniqueIndex("blog_posts_slug_idx").on(t.slug),
    index("blog_posts_status_published_idx").on(t.status, t.publishedAt),
    index("blog_posts_pillar_idx").on(t.pillar),
  ],
);

export const blogPostsRelations = relations(blogPosts, ({ one }) => ({
  createdByProfile: one(profiles, {
    fields: [blogPosts.createdBy],
    references: [profiles.id],
    relationName: "blog_post_created_by",
  }),
  updatedByProfile: one(profiles, {
    fields: [blogPosts.updatedBy],
    references: [profiles.id],
    relationName: "blog_post_updated_by",
  }),
}));

export type BlogPostRow = typeof blogPosts.$inferSelect;
export type NewBlogPostRow = typeof blogPosts.$inferInsert;
