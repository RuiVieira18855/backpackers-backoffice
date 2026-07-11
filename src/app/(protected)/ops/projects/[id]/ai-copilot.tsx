"use client";

import { useTranslations } from "next-intl";
import { AiCard } from "@/components/ai/ai-card";
import { suggestProjectTasks } from "./ai-actions";

export function ProjectCopilot({ projectId }: { projectId: string }) {
  const t = useTranslations("ai.projectCopilot");
  return (
    <AiCard
      title={t("title")}
      description={t("description")}
      cta={t("cta")}
      regenerateCta={t("regenerate")}
      disclaimer={t("disclaimer")}
      notConfiguredMessage={t("notConfigured")}
      action={() => suggestProjectTasks(projectId)}
    />
  );
}
