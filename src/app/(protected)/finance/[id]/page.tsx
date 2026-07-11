import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { asc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { events, projects, transactions } from "@/lib/db/schema";
import { getAllPillars, requireSkill } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import { TransactionForm } from "@/components/finance/transaction-form";
import { updateTransaction } from "./actions";
import { DeleteTransactionButton } from "./delete-button";

type Props = { params: Promise<{ id: string }> };

export default async function TransactionDetailPage({ params }: Props) {
  await requireSkill("finance");
  const { id } = await params;
  const t = await getTranslations("finance.detail");

  const tx = await db.query.transactions.findFirst({
    where: eq(transactions.id, id),
    with: { pillar: true, createdByProfile: true },
  });

  if (!tx) notFound();

  const [pillars, allEvents, allProjects] = await Promise.all([
    getAllPillars(),
    db.query.events.findMany({
      orderBy: [asc(events.name)],
      limit: 500,
      columns: { id: true, name: true },
    }),
    db.query.projects.findMany({
      orderBy: [asc(projects.name)],
      limit: 500,
      columns: { id: true, name: true },
    }),
  ]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
          <Link href="/finance">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("backToList")}
          </Link>
        </Button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl text-foreground leading-none">
              {new Intl.NumberFormat("pt-PT", {
                style: "currency",
                currency: tx.currency,
              }).format(Number(tx.amount))}
            </h1>
            <p className="mt-2 text-base text-muted-foreground">
              {tx.description}
            </p>
          </div>
          <DeleteTransactionButton
            transactionId={tx.id}
            label={tx.description}
          />
        </div>
      </div>

      <TransactionForm
        pillars={pillars.map((p) => ({ id: p.id, name: p.name }))}
        events={allEvents}
        projects={allProjects}
        transaction={{
          id: tx.id,
          type: tx.type,
          category: tx.category,
          amount: tx.amount,
          currency: tx.currency,
          description: tx.description,
          date: tx.date,
          invoiceNumber: tx.invoiceNumber,
          vendor: tx.vendor,
          status: tx.status,
          dueDate: tx.dueDate,
          pillarId: tx.pillarId,
          eventId: tx.eventId,
          projectId: tx.projectId,
          notes: tx.notes,
        }}
        action={updateTransaction}
      />
    </div>
  );
}
