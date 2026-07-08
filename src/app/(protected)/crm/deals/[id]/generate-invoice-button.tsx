"use client";

import { useTransition } from "react";
import { Receipt } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { generateInvoiceFromDeal } from "./actions";

type Props = {
  dealId: string;
  dealName: string;
};

export function GenerateInvoiceButton({ dealId, dealName }: Props) {
  const t = useTranslations("deals.detail");
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(t("generateInvoiceConfirm", { name: dealName })))
          return;
        startTransition(() => generateInvoiceFromDeal(dealId));
      }}
    >
      <Receipt className="mr-2 h-3.5 w-3.5" />
      {pending ? t("generatingInvoice") : t("generateInvoice")}
    </Button>
  );
}
