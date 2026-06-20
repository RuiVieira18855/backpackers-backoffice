"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/(protected)/actions";

export function SignOutButton() {
  const t = useTranslations("common");
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => signOut())}
    >
      <LogOut className="mr-2 h-4 w-4" />
      {pending ? t("signingOut") : t("signOut")}
    </Button>
  );
}
