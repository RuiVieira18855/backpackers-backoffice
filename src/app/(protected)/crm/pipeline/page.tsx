import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { requireProfile } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import { KanbanBoard, type KanbanContact } from "./kanban-board";

export default async function PipelinePage() {
  await requireProfile();
  const t = await getTranslations("crm.pipeline");

  const rows = await db.query.contacts.findMany({
    with: { pillar: true },
    orderBy: [desc(contacts.createdAt)],
    limit: 300,
  });

  const kanbanContacts: KanbanContact[] = rows.map((c) => ({
    id: c.id,
    fullName: c.fullName,
    company: c.company,
    type: c.type,
    pillarName: c.pillar?.name ?? null,
    stage: c.stage,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
          <Link href="/crm">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("backToList")}
          </Link>
        </Button>
        <h1 className="font-display text-4xl sm:text-6xl text-foreground leading-none">
          {t("title")}
        </h1>
        <p className="mt-2 text-base text-muted-foreground">{t("subtitle")}</p>
      </div>

      <KanbanBoard contacts={kanbanContacts} />
    </div>
  );
}
