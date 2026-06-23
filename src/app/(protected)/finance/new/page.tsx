import { getTranslations } from "next-intl/server";
import { getAllPillars, requireRole } from "@/lib/dal";
import { TransactionForm } from "@/components/finance/transaction-form";
import { createTransaction } from "./actions";

const VALID_TYPES = ["income", "expense"] as const;

type SearchParams = Promise<{ type?: string }>;

export default async function NewTransactionPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireRole("super_user");
  const t = await getTranslations("finance.form");
  const sp = await searchParams;
  const pillars = await getAllPillars();

  const defaultType =
    sp.type && (VALID_TYPES as readonly string[]).includes(sp.type)
      ? (sp.type as (typeof VALID_TYPES)[number])
      : undefined;

  return (
    <div className="max-w-4xl mx-auto px-6 md:px-10 py-10 space-y-8">
      <div>
        <h1 className="font-display text-5xl text-foreground leading-none">
          {t("pageTitle")}
        </h1>
        <p className="mt-2 text-base text-muted-foreground">{t("subtitle")}</p>
      </div>
      <TransactionForm
        pillars={pillars.map((p) => ({ id: p.id, name: p.name }))}
        defaultType={defaultType}
        action={createTransaction}
      />
    </div>
  );
}
