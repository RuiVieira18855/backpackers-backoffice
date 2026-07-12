"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserCheck, UserX } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { toggleUserDisabled } from "./actions";

export function DisableUserButton({
  userId,
  userLabel,
  disabled,
}: {
  userId: string;
  userLabel: string;
  disabled: boolean;
}) {
  const t = useTranslations("admin.users.disable");
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function handleClick() {
    const shouldDisable = !disabled;
    const ok = await confirm({
      title: shouldDisable
        ? t("confirmDisableTitle", { name: userLabel })
        : t("confirmEnableTitle", { name: userLabel }),
      description: shouldDisable ? t("confirmDisableHint") : undefined,
      confirmLabel: shouldDisable ? t("disable") : t("enable"),
      destructive: shouldDisable,
    });
    if (!ok) return;

    startTransition(async () => {
      const result = await toggleUserDisabled(userId, shouldDisable);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.info(shouldDisable ? t("disabledToast") : t("enabledToast"));
      router.refresh();
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={pending}
      className={disabled ? "" : "text-destructive hover:text-destructive"}
    >
      {disabled ? (
        <UserCheck className="mr-2 h-3.5 w-3.5" />
      ) : (
        <UserX className="mr-2 h-3.5 w-3.5" />
      )}
      {disabled ? t("enable") : t("disable")}
    </Button>
  );
}
