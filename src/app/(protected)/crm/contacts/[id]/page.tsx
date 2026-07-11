import { notFound } from "next/navigation";
import Link from "next/link";
import { CalendarPlus, ChevronLeft, FolderPlus, Merge } from "lucide-react";
import { desc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { contacts, events, projects } from "@/lib/db/schema";
import { getAllPillars, requireProfile } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ContactForm } from "@/components/contacts/contact-form";
import { ContactChannels } from "@/components/contacts/contact-channels";
import { ContactTimeline } from "@/components/contacts/contact-timeline";
import { getTemplatesForScope } from "@/lib/templates";
import { getCustomFieldDefs } from "@/lib/custom-fields";
import { updateContact } from "./actions";
import { DeleteContactButton } from "./delete-button";

type Props = { params: Promise<{ id: string }> };

export default async function ContactDetailPage({ params }: Props) {
  await requireProfile();
  const { id } = await params;
  const t = await getTranslations("crm.detail");
  const tHistory = await getTranslations("crm.history");
  const tEventStatuses = await getTranslations("ops.eventStatuses");
  const tProjectStatuses = await getTranslations("ops.projectStatuses");

  const contact = await db.query.contacts.findFirst({
    where: eq(contacts.id, id),
    with: { pillar: true, owner: true },
  });

  if (!contact) {
    notFound();
  }

  // Fetch related events + projects in parallel
  const [pillars, relatedEvents, relatedProjects, noteTemplates, customDefs] =
    await Promise.all([
      getAllPillars(),
      db.query.events.findMany({
        where: eq(events.clientContactId, contact.id),
        with: { pillar: true },
        orderBy: [desc(events.startAt), desc(events.createdAt)],
        limit: 50,
      }),
      db.query.projects.findMany({
        where: eq(projects.clientContactId, contact.id),
        with: { pillar: true },
        orderBy: [desc(projects.createdAt)],
        limit: 50,
      }),
      getTemplatesForScope("contact_note"),
      getCustomFieldDefs("contact"),
    ]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
          <Link href="/crm">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("backToList")}
          </Link>
        </Button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl text-foreground leading-none">
              {contact.fullName}
            </h1>
            <p className="mt-2 text-base text-muted-foreground">
              {contact.company ? `${contact.company} · ` : ""}
              {contact.pillar?.name ?? ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/crm/contacts/${contact.id}/merge`}>
                <Merge className="mr-2 h-3.5 w-3.5" />
                {t("mergeCta")}
              </Link>
            </Button>
            <DeleteContactButton
              contactId={contact.id}
              contactName={contact.fullName}
            />
          </div>
        </div>
        <div className="mt-4">
          <ContactChannels email={contact.email} phone={contact.phone} />
        </div>
      </div>

      <ContactTimeline contactId={contact.id} />

      <ContactForm
        pillars={pillars.map((p) => ({ id: p.id, name: p.name }))}
        contact={{
          id: contact.id,
          fullName: contact.fullName,
          pillarId: contact.pillarId,
          type: contact.type,
          stage: contact.stage,
          source: contact.source,
          email: contact.email,
          phone: contact.phone,
          company: contact.company,
          jobTitle: contact.jobTitle,
          notes: contact.notes,
        }}
        noteTemplates={noteTemplates}
        customFieldDefs={customDefs}
        customFieldValues={
          (contact.customFields ?? {}) as Record<
            string,
            string | number | null
          >
        }
        action={updateContact}
      />

      {/* Related events */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle>{tHistory("eventsTitle")}</CardTitle>
              <CardDescription>
                {tHistory("eventsCount", { count: relatedEvents.length })}
              </CardDescription>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href={`/ops/events/new?client=${contact.id}`}>
                <CalendarPlus className="mr-2 h-4 w-4" />
                {tHistory("addEvent")}
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {relatedEvents.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground italic">
              {tHistory("noEvents")}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {relatedEvents.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/ops/events/${e.id}`}
                    className="flex items-center justify-between gap-3 px-6 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-accent/40 px-2 py-0.5 text-xs text-foreground">
                          {tEventStatuses(e.status as never)}
                        </span>
                        <span className="text-sm font-medium text-foreground truncate">
                          {e.name}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {e.pillar?.name ?? ""}
                        {e.location ? ` · ${e.location}` : ""}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0">
                      {e.startAt
                        ? new Intl.DateTimeFormat("pt-PT", {
                            dateStyle: "short",
                            timeStyle: "short",
                          }).format(e.startAt)
                        : "—"}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Related projects */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle>{tHistory("projectsTitle")}</CardTitle>
              <CardDescription>
                {tHistory("projectsCount", { count: relatedProjects.length })}
              </CardDescription>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href={`/ops/projects/new?client=${contact.id}`}>
                <FolderPlus className="mr-2 h-4 w-4" />
                {tHistory("addProject")}
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {relatedProjects.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground italic">
              {tHistory("noProjects")}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {relatedProjects.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/ops/projects/${p.id}`}
                    className="flex items-center justify-between gap-3 px-6 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-accent/40 px-2 py-0.5 text-xs text-foreground">
                          {tProjectStatuses(p.status as never)}
                        </span>
                        <span className="text-sm font-medium text-foreground truncate">
                          {p.name}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {p.pillar?.name ?? ""}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0">
                      {p.targetDate ?? "—"}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
