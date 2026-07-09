"use client";

import { useTransition } from "react";
import { Receipt } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { generateInvoiceFromDeal } from "./actions";

type Props = {
  dealId: string;
  dealName: string;
};

export function GenerateInvoiceButton({ dealId, dealName }: Props) {
  const t = useTranslations("deals.detail");
  const tCommon = useTranslations("common");
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();

  const handleClick = async () => {
    const ok = await confirm({
      title: t("generateInvoiceConfirm", { name: dealName }),
      confirmLabel: t("generateInvoice"),
      cancelLabel: tCommon("cancel"),
    });
    if (!ok) return;
    startTransition(() => generateInvoiceFromDeal(dealId));
  };

  return (
    <Button type="button" variant="outline" size="sm" disabled={pending} onClick={handleClick}>
      <Receipt className="mr-2 h-3.5 w-3.5" />
      {pending ? t("generatingInvoice") : t("generateInvoice")}
    </Button>
  );
}
