import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { asc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { contacts, deals } from "@/lib/db/schema";
import { getAllPillars, requireProfile } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import { DealForm } from "@/components/deals/deal-form";
import { getTemplatesForScope } from "@/lib/templates";
import { getCustomFieldDefs } from "@/lib/custom-fields";
import { updateDeal } from "./actions";
import { DeleteDealButton } from "./delete-button";

type Props = { params: Promise<{ id: string }> };

export default async function DealDetailPage({ params }: Props) {
  await requireProfile();
  const { id } = await params;
  const t = await getTranslations("deals.detail");

  const deal = await db.query.deals.findFirst({
    where: eq(deals.id, id),
  });
  if (!deal) notFound();

  const [pillars, allContacts, descriptionTemplates, customFieldDefs] =
    await Promise.all([
      getAllPillars(),
      db.query.contacts.findMany({
        orderBy: [asc(contacts.fullName)],
        limit: 500,
        columns: { id: true, fullName: true, company: true },
      }),
      getTemplatesForScope("deal_description"),
      getCustomFieldDefs("deal"),
    ]);

  return (
    <div className="max-w-3xl mx-auto px-6 md:px-10 py-10 space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
          <Link href="/crm/deals">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("backToList")}
          </Link>
        </Button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-5xl text-foreground leading-none">
              {deal.name}
            </h1>
            {deal.value && (
              <p className="mt-2 text-base text-muted-foreground">
                {new Intl.NumberFormat("pt-PT", {
                  style: "currency",
                  currency: deal.currency,
                }).format(Number(deal.value))}
              </p>
            )}
          </div>
          <DeleteDealButton dealId={deal.id} dealName={deal.name} />
        </div>
      </div>

      <DealForm
        pillars={pillars.map((p) => ({ id: p.id, name: p.name }))}
        contacts={allContacts}
        deal={{
          id: deal.id,
          name: deal.name,
          pillarId: deal.pillarId,
          contactId: deal.contactId,
          stage: deal.stage,
          value: deal.value,
          currency: deal.currency,
          expectedCloseDate: deal.expectedCloseDate,
          description: deal.description,
          notes: deal.notes,
        }}
        descriptionTemplates={descriptionTemplates}
        customFieldDefs={customFieldDefs}
        customFieldValues={
          (deal.customFields ?? {}) as Record<
            string,
            string | number | null
          >
        }
        action={updateDeal}
      />
    </div>
  );
}
