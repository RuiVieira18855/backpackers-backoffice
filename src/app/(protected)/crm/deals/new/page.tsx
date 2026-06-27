import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { asc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { getAllPillars, requireProfile } from "@/lib/dal";
import { DealForm } from "@/components/deals/deal-form";
import { createDeal } from "./actions";

type SearchParams = Promise<{ client?: string; stage?: string }>;

const STAGES = ["lead", "qualified", "proposal", "negotiation", "won", "lost"] as const;

export default async function NewDealPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireProfile();
  const t = await getTranslations("deals.form");
  const sp = await searchParams;

  const [pillars, allContacts, prefillContact] = await Promise.all([
    getAllPillars(),
    db.query.contacts.findMany({
      orderBy: [asc(contacts.fullName)],
      limit: 500,
      columns: { id: true, fullName: true, company: true },
    }),
    sp.client
      ? db.query.contacts.findFirst({
          where: eq(contacts.id, sp.client),
          columns: { id: true },
        })
      : Promise.resolve(null),
  ]);

  const defaultStage =
    sp.stage && (STAGES as readonly string[]).includes(sp.stage)
      ? (sp.stage as (typeof STAGES)[number])
      : undefined;

  return (
    <div className="max-w-3xl mx-auto px-6 md:px-10 py-10 space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
          <Link href="/crm/deals">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("backToList")}
          </Link>
        </Button>
        <h1 className="font-display text-5xl text-foreground leading-none">
          {t("pageTitle")}
        </h1>
        <p className="mt-2 text-base text-muted-foreground">{t("subtitle")}</p>
      </div>

      <DealForm
        pillars={pillars.map((p) => ({ id: p.id, name: p.name }))}
        contacts={allContacts}
        defaultContactId={prefillContact?.id}
        defaultStage={defaultStage}
        action={createDeal}
      />
    </div>
  );
}
