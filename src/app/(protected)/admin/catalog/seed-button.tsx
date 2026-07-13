"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { seedSynergyActivities } from "./seed-actions";

export function SeedSynergyButton() {
  const t = useTranslations("admin.catalog.seed");
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function onClick() {
    const ok = await confirm({
      title: t("confirmTitle"),
      description: t("confirmDescription"),
      confirmLabel: t("confirmCta"),
    });
    if (!ok) return;

    startTransition(async () => {
      const result = await seedSynergyActivities();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        t("doneToast", {
          inserted: result.inserted,
          updated: result.updated,
        }),
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
