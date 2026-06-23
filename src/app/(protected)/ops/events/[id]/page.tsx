import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { eq, asc } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { contacts, events } from "@/lib/db/schema";
import { getAllPillars, requireProfile } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import { EventForm } from "@/components/events/event-form";
import { LinkedFinanceCard } from "@/components/finance/linked-finance-card";
import { LinkedDocsCard } from "@/components/docs/linked-docs-card";
import { updateEvent } from "./actions";
import { DeleteEventButton } from "./delete-button";

type Props = { params: Promise<{ id: string }> };

export default async function EventDetailPage({ params }: Props) {
  await requireProfile();
  const { id } = await params;
  const t = await getTranslations("ops.detail");

  const event = await db.query.events.findFirst({
    where: eq(events.id, id),
    with: { pillar: true, owner: true, clientContact: true },
  });

  if (!event) notFound();

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
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
          <Link href="/ops/events">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("backToList")}
          </Link>
        </Button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-5xl text-foreground leading-none">
              {event.name}
            </h1>
            <p className="mt-2 text-base text-muted-foreground">
              {event.pillar?.name ?? ""}
              {event.location ? ` · ${event.location}` : ""}
            </p>
          </div>
          <DeleteEventButton eventId={event.id} eventName={event.name} />
        </div>
      </div>

      <EventForm
        pillars={pillars.map((p) => ({ id: p.id, name: p.name }))}
        contacts={allContacts.map((c) => ({
          id: c.id,
          fullName: c.fullName,
          company: c.company,
        }))}
        event={{
          id: event.id,
          name: event.name,
          pillarId: event.pillarId,
          type: event.type,
          status: event.status,
          description: event.description,
          location: event.location,
          startAt: event.startAt,
          endAt: event.endAt,
          capacity: event.capacity,
          clientContactId: event.clientContactId,
          notes: event.notes,
        }}
        action={updateEvent}
      />

      <LinkedDocsCard eventId={event.id} />
      <LinkedFinanceCard eventId={event.id} />
    </div>
  );
}
