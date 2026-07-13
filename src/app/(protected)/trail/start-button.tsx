"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { startAssessment } from "./actions";

export function StartAssessmentButton() {
  const t = useTranslations("trail.start");
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const result = await startAssessment();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.push(`/trail/take?a=${result.assessmentId}`);
    });
  }

  return (
    <Button onClick={onClick} disabled={pending}>
      <Play className="mr-2 h-4 w-4" />
      {pending ? t("starting") : t("cta")}
    </Button>
  );
}
