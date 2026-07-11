"use client";

import { useTranslations } from "next-intl";
import { AiCard } from "@/components/ai/ai-card";
import { suggestDealNextSteps } from "./ai-actions";

export function DealCopilot({ dealId }: { dealId: string }) {
  const t = useTranslations("ai.dealCopilot");
  return (
    <AiCard
      title={t("title")}
      description={t("description")}
      cta={t("cta")}
      regenerateCta={t("regenerate")}
      disclaimer={t("disclaimer")}
      notConfiguredMessage={t("notConfigured")}
      action={() => suggestDealNextSteps(dealId)}
    />
  );
}
