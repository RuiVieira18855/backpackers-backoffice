import "server-only";
import { ilike, or, desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts, events, projects, tasks, documents } from "@/lib/db/schema";

export type SearchHit = {
  kind: "contact" | "event" | "project" | "task" | "document";
  id: string;
  label: string;
  sublabel: string | null;
};

const PER_KIND_LIMIT = 5;

/**
 * Global cross-module search. Case-insensitive ILIKE match on key text fields.
 * RLS is bypassed (Drizzle uses pooler) — for now we trust the requireProfile
 * gate at the action layer. When per-pillar filtering becomes critical,
 * pass profile pillarAccess and filter here.
 */
export async function globalSearch(query: string): Promise<SearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const pattern = `%${q}%`;

  const [contactRows, eventRows, projectRows, taskRows, documentRows] =
    await Promise.all([
      db
        .select({
          id: contacts.id,
          label: contacts.fullName,
          sublabel: sql<string | null>`coalesce(${contacts.company}, ${contacts.email})`,
        })
        .from(contacts)
        .where(
          or(
            ilike(contacts.fullName, pattern),
            ilike(contacts.email, pattern),
            ilike(contacts.company, pattern),
            ilike(contacts.phone, pattern),
          ),
        )
        .orderBy(desc(contacts.createdAt))
        .limit(PER_KIND_LIMIT),

      db
        .select({
          id: events.id,
          label: events.name,
          sublabel: events.location,
        })
        .from(events)
        .where(
          or(
            ilike(events.name, pattern),
            ilike(events.location, pattern),
            ilike(events.description, pattern),
          ),
        )
        .orderBy(desc(events.startAt))
        .limit(PER_KIND_LIMIT),

      db
        .select({
          id: projects.id,
          label: projects.name,
          sublabel: projects.description,
        })
        .from(projects)
        .where(
          or(
            ilike(projects.name, pattern),
            ilike(projects.description, pattern),
          ),
        )
        .orderBy(desc(projects.createdAt))
        .limit(PER_KIND_LIMIT),

      db
        .select({
          id: tasks.id,
          label: tasks.title,
          sublabel: tasks.description,
        })
        .from(tasks)
        .where(
          or(ilike(tasks.title, pattern), ilike(tasks.description, pattern)),
        )
        .orderBy(desc(tasks.createdAt))
        .limit(PER_KIND_LIMIT),

      db
        .select({
          id: documents.id,
          label: documents.title,
          sublabel: documents.fileName,
        })
        .from(documents)
        .where(
          or(
            ilike(documents.title, pattern),
            ilike(documents.fileName, pattern),
            ilike(documents.description, pattern),
          ),
        )
        .orderBy(desc(documents.createdAt))
        .limit(PER_KIND_LIMIT),
    ]);

  const hits: SearchHit[] = [
    ...contactRows.map<SearchHit>((r) => ({ kind: "contact", ...r })),
    ...eventRows.map<SearchHit>((r) => ({ kind: "event", ...r })),
    ...projectRows.map<SearchHit>((r) => ({ kind: "project", ...r })),
    ...taskRows.map<SearchHit>((r) => ({ kind: "task", ...r })),
    ...documentRows.map<SearchHit>((r) => ({ kind: "document", ...r })),
  ];

  return hits;
}
