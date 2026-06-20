"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { deleteTask } from "./actions";

export function DeleteTaskButton({
  taskId,
  taskTitle,
}: {
  taskId: string;
  taskTitle: string;
}) {
  const t = useTranslations("ops.tasks.detail");
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!window.confirm(t("deleteConfirm", { title: taskTitle }))) return;
    startTransition(() => deleteTask(taskId));
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
