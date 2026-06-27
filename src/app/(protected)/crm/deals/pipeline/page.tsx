import Link from "next/link";
import { ChevronLeft, Plus } from "lucide-react";
import { desc } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { contacts, deals } from "@/lib/db/schema";
import { getAllPillars, requireProfile } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import { DealsKanban, type KanbanDeal } from "./kanban-board";
import { inArray } from "drizzle-orm";

export default async function DealsPipelinePage() {
  await requireProfile();
  const t = await getTranslations("deals.pipeline");

  const [rows, allPillars] = await Promise.all([
    db.select().from(deals).orderBy(desc(deals.updatedAt)).limit(500),
    getAllPillars(),
  ]);

  const contactIds = Array.from(
    new Set(rows.map((d) => d.contactId).filter((x): x is string => Boolean(x))),
  );
  const refContacts = contactIds.length
    ? await db
        .select({ id: contacts.id, fullName: contacts.fullName })
        .from(contacts)
        .where(inArray(contacts.id, contactIds))
    : [];
  const contactById = new Map(refContacts.map((c) => [c.id, c]));
  const pillarById = new Map(allPillars.map((p) => [p.id, p]));

  const board: KanbanDeal[] = rows.map((d) => ({
    id: d.id,
    name: d.name,
    pillarName: pillarById.get(d.pillarId)?.name ?? null,
    contactName: d.contactId
      ? (contactById.get(d.contactId)?.fullName ?? null)
      : null,
    value: d.value,
    currency: d.currency,
    stage: d.stage,
  }));

  return (
    <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-10 space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
            <Link href="/crm/deals">
              <ChevronLeft className="mr-1 h-4 w-4" />
              {t("backToList")}
            </Link>
          </Button>
          <h1 className="font-display text-5xl text-foreground leading-none">
            {t("title")}
          </h1>
          <p className="mt-2 text-base text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button asChild>
          <Link href="/crm/deals/new">
            <Plus className="mr-2 h-4 w-4" />
            {t("newDeal")}
          </Link>
        </Button>
      </div>

      <DealsKanban deals={board} />
    </div>
  );
}
