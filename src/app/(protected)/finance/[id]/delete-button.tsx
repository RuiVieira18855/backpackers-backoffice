"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { deleteTransaction } from "./actions";

export function DeleteTransactionButton({
  transactionId,
  label,
}: {
  transactionId: string;
  label: string;
}) {
  const t = useTranslations("finance.detail");
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!window.confirm(t("deleteConfirm", { label }))) return;
    startTransition(() => deleteTransaction(transactionId));
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-destructive hover:text-destructive hover:bg-destructive/10"
      onClick={onClick}
      disabled={pending}
    >
      <Trash2 className="mr-2 h-4 w-4" />
      {pending ? t("deleting") : t("delete")}
    </Button>
  );
}
