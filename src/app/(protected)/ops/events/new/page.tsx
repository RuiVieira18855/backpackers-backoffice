import { getTranslations } from "next-intl/server";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { getAllPillars, requireRole } from "@/lib/dal";
import { EventForm } from "@/components/events/event-form";
import { createEvent } from "./actions";

const VALID_TYPES = [
  "tour",
  "team_building",
  "workshop",
  "meeting",
  "retreat",
  "other",
] as const;

type SearchParams = Promise<{ type?: string }>;

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireRole("admin_grupo", "admin_pilar");
  const t = await getTranslations("ops.form");
  const sp = await searchParams;

  const defaultType =
    sp.type && (VALID_TYPES as readonly string[]).includes(sp.type)
      ? (sp.type as (typeof VALID_TYPES)[number])
      : undefined;

  const [pillars, allContacts] = await Promise.all([
    getAllPillars(),
    db.query.contacts.findMany({
      orderBy: [asc(contacts.fullName)],
      limit: 500,
    }),
  ]);

  return (
    <div className="max-w-4xl mx-auto px-6 md:px-10 py-10 space-y-8">
      <div>
        <h1 className="font-display text-5xl text-foreground leading-none">
          {t("title")}
        </h1>
        <p className="mt-2 text-base text-muted-foreground">{t("subtitle")}</p>
      </div>
      <EventForm
        pillars={pillars.map((p) => ({ id: p.id, name: p.name }))}
        contacts={allContacts.map((c) => ({
          id: c.id,
          fullName: c.fullName,
          company: c.company,
        }))}
        defaultType={defaultType}
        action={createEvent}
      />
    </div>
  );
}
