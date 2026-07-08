"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Power, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { deleteWorkflow, toggleWorkflowActive } from "../actions";

type Props = {
  workflowId: string;
  isActive: boolean;
  name: string;
};

export function WorkflowSideActions({ workflowId, isActive, name }: Props) {
  const t = useTranslations("admin.workflows");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            await toggleWorkflowActive(workflowId, !isActive);
            router.refresh();
          });
        }}
      >
        <Power className="mr-2 h-3.5 w-3.5" />
        {isActive ? t("deactivate") : t("activate")}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(t("deleteConfirm", { name }))) return;
          startTransition(async () => {
            await deleteWorkflow(workflowId);
            router.push("/admin/workflows");
          });
        }}
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="mr-2 h-3.5 w-3.5" />
        {t("delete")}
      </Button>
    </div>
  );
}
