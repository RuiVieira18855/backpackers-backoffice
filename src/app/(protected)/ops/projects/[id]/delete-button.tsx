"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { deleteProject } from "./actions";

export function DeleteProjectButton({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const t = useTranslations("ops.projects.detail");
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!window.confirm(t("deleteConfirm", { name: projectName }))) return;
    startTransition(() => deleteProject(projectId));
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
