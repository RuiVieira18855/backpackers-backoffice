"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Send, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import {
  deleteWebhookAction,
  rotateWebhookSecret,
  testWebhookAction,
} from "../actions";

type Props = {
  webhookId: string;
  isActive: boolean;
  name: string;
};

export function WebhookSideActions({ webhookId, name }: Props) {
  const t = useTranslations("admin.webhooks");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();

  const handleTest = () =>
    startTransition(async () => {
      await testWebhookAction(webhookId);
      toast.success(t("testSentToast"));
      router.refresh();
    });

  const handleRotate = async () => {
    const ok = await confirm({
      title: t("rotateConfirm"),
      confirmLabel: t("rotateCta"),
      cancelLabel: tCommon("cancel"),
      destructive: true,
    });
    if (!ok) return;
    startTransition(async () => {
      await rotateWebhookSecret(webhookId);
      toast.success(t("rotatedToast"));
      router.refresh();
    });
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: t("deleteConfirm", { name }),
      confirmLabel: t("delete"),
      cancelLabel: tCommon("cancel"),
      destructive: true,
    });
    if (!ok) return;
    startTransition(async () => {
      await deleteWebhookAction(webhookId);
      toast.info(t("deletedToast", { name }));
      router.push("/admin/webhooks");
    });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={handleTest}>
        <Send className="mr-2 h-3.5 w-3.5" />
        {t("testCta")}
      </Button>
      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={handleRotate}>
        <KeyRound className="mr-2 h-3.5 w-3.5" />
        {t("rotateCta")}
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
