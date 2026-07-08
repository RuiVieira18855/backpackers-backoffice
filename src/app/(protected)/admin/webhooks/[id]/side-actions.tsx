"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Send, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
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
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await testWebhookAction(webhookId);
            router.refresh();
          })
        }
      >
        <Send className="mr-2 h-3.5 w-3.5" />
        {t("testCta")}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(t("rotateConfirm"))) return;
          startTransition(async () => {
            await rotateWebhookSecret(webhookId);
            router.refresh();
          });
        }}
      >
        <KeyRound className="mr-2 h-3.5 w-3.5" />
        {t("rotateCta")}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(t("deleteConfirm", { name }))) return;
          startTransition(async () => {
            await deleteWebhookAction(webhookId);
            router.push("/admin/webhooks");
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
