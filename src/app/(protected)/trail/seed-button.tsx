"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { seedTrailQuestions } from "./actions";

export function SeedTrailQuestionsButton() {
  const t = useTranslations("trail.seed");
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const result = await seedTrailQuestions();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        t("doneToast", { inserted: result.inserted, updated: result.updated }),
      );
      router.refresh();
    });
  }

  return (
    <Button variant="outline" onClick={onClick} disabled={pending}>
      <Download className="mr-2 h-4 w-4" />
      {pending ? t("running") : t("cta")}
    </Button>
  );
}
