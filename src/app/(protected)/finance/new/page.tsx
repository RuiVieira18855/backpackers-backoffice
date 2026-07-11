import { asc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { events, projects } from "@/lib/db/schema";
import { getAllPillars, requireSkill } from "@/lib/dal";
import { TransactionForm } from "@/components/finance/transaction-form";
import { createTransaction } from "./actions";

const VALID_TYPES = ["income", "expense"] as const;

type SearchParams = Promise<{
  type?: string;
  event?: string;
  project?: string;
  pillar?: string;
}>;

export default async function NewTransactionPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireSkill("finance");
  const t = await getTranslations("finance.form");
  const sp = await searchParams;
  const pillars = await getAllPillars();

  const [allEvents, allProjects, prefillEvent, prefillProject] =
    await Promise.all([
      db.query.events.findMany({
        orderBy: [asc(events.name)],
        limit: 500,
        columns: { id: true, name: true, pillarId: true },
      }),
      db.query.projects.findMany({
        orderBy: [asc(projects.name)],
        limit: 500,
        columns: { id: true, name: true, pillarId: true },
      }),
      sp.event
        ? db.query.events.findFirst({
            where: eq(events.id, sp.event),
            columns: { id: true, pillarId: true },
          })
        : Promise.resolve(null),
      sp.project
        ? db.query.projects.findFirst({
            where: eq(projects.id, sp.project),
            columns: { id: true, pillarId: true },
          })
        : Promise.resolve(null),
    ]);

  const defaultType =
    sp.type && (VALID_TYPES as readonly string[]).includes(sp.type)
      ? (sp.type as (typeof VALID_TYPES)[number])
      : undefined;

  const defaultPillarId =
    sp.pillar ??
    prefillEvent?.pillarId ??
    prefillProject?.pillarId ??
    undefined;

  const returnTo = prefillEvent
    ? `/ops/events/${prefillEvent.id}`
    : prefillProject
      ? `/ops/projects/${prefillProject.id}`
      : undefined;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 space-y-8">
      <div>
        <h1 className="font-display text-4xl sm:text-5xl text-foreground leading-none">
          {t("pageTitle")}
        </h1>
        <p className="mt-2 text-base text-muted-foreground">{t("subtitle")}</p>
      </div>
      <TransactionForm
        pillars={pillars.map((p) => ({ id: p.id, name: p.name }))}
        events={allEvents.map((e) => ({ id: e.id, name: e.name }))}
        projects={allProjects.map((p) => ({ id: p.id, name: p.name }))}
        defaultType={defaultType}
        defaultEventId={prefillEvent?.id}
        defaultProjectId={prefillProject?.id}
        defaultPillarId={defaultPillarId ?? undefined}
        lockContext={Boolean(prefillEvent || prefillProject)}
        returnTo={returnTo}
        action={createTransaction}
      />
    </div>
  );
}
