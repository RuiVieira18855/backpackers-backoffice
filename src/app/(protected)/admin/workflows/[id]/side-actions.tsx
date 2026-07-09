"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Power, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { deleteWorkflow, toggleWorkflowActive } from "../actions";

type Props = {
  workflowId: string;
  isActive: boolean;
  name: string;
};

export function WorkflowSideActions({ workflowId, isActive, name }: Props) {
  const t = useTranslations("admin.workflows");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();

  const handleToggle = () =>
    startTransition(async () => {
      await toggleWorkflowActive(workflowId, !isActive);
      toast.info(isActive ? t("deactivatedToast") : t("activatedToast"));
      router.refresh();
    });

  const handleDelete = async () => {
    const ok = await confirm({
      title: t("deleteConfirm", { name }),
      confirmLabel: t("delete"),
      cancelLabel: tCommon("cancel"),
      destructive: true,
    });
    if (!ok) return;
    startTransition(async () => {
      await deleteWorkflow(workflowId);
      toast.info(t("deletedToast", { name }));
      router.push("/admin/workflows");
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={handleToggle}>
        <Power className="mr-2 h-3.5 w-3.5" />
        {isActive ? t("deactivate") : t("activate")}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={handleDelete}
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="mr-2 h-3.5 w-3.5" />
        {t("delete")}
      </Button>
    </div>
  );
}
