"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { deleteContact } from "./actions";

export function DeleteContactButton({
  contactId,
  contactName,
}: {
  contactId: string;
  contactName: string;
}) {
  const t = useTranslations("crm.detail");
  const tCommon = useTranslations("common");
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();

  const onClick = async () => {
    const ok = await confirm({
      title: t("deleteConfirm", { name: contactName }),
      confirmLabel: t("delete"),
      cancelLabel: tCommon("cancel"),
      destructive: true,
    });
    if (!ok) return;
    startTransition(() => deleteContact(contactId));
  };

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
