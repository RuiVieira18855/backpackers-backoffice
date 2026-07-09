"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { deleteDeal } from "./actions";

type Props = {
  dealId: string;
  dealName: string;
};

export function DeleteDealButton({ dealId, dealName }: Props) {
  const t = useTranslations("deals.detail");
  const tCommon = useTranslations("common");
  const confirm = useConfirm();
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handle = async () => {
    const ok = await confirm({
      title: t("deleteConfirm", { name: dealName }),
      confirmLabel: t("delete"),
      cancelLabel: tCommon("cancel"),
      destructive: true,
    });
    if (!ok) return;
    startTransition(async () => {
      await deleteDeal(dealId);
      toast.info(t("deletedToast", { name: dealName }));
      router.refresh();
    });
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={handle}
      className="text-destructive hover:text-destructive"
    >
      <Trash2 className="mr-2 h-3.5 w-3.5" />
      {pending ? t("deleting") : t("delete")}
    </Button>
  );
}
