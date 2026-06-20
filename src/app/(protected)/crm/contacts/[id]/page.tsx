import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { getAllPillars, requireProfile } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import { ContactForm } from "@/components/contacts/contact-form";
import { updateContact } from "./actions";
import { DeleteContactButton } from "./delete-button";

type Props = { params: Promise<{ id: string }> };

export default async function ContactDetailPage({ params }: Props) {
  await requireProfile();
  const { id } = await params;
  const t = await getTranslations("crm.detail");

  const contact = await db.query.contacts.findFirst({
    where: eq(contacts.id, id),
    with: { pillar: true, owner: true },
  });

  if (!contact) {
    notFound();
  }

  const pillars = await getAllPillars();

  return (
    <div className="max-w-4xl mx-auto px-6 md:px-10 py-10 space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
          <Link href="/crm">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("backToList")}
          </Link>
        </Button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-5xl text-foreground leading-none">
              {contact.fullName}
            </h1>
            <p className="mt-2 text-base text-muted-foreground">
              {contact.company ? `${contact.company} · ` : ""}
              {contact.pillar?.name ?? ""}
            </p>
          </div>
          <DeleteContactButton
            contactId={contact.id}
            contactName={contact.fullName}
          />
        </div>
      </div>

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
        action={updateContact}
      />
    </div>
  );
}
