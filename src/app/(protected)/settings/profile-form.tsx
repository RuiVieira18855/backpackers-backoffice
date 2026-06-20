"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateOwnProfile, type SettingsState } from "./actions";

const initialState: SettingsState = {};

type Props = {
  email: string;
  fullName: string | null;
  roleLabel: string;
};

export function ProfileForm({ email, fullName, roleLabel }: Props) {
  const t = useTranslations("settings");
  const [state, formAction, pending] = useActionState(
    updateOwnProfile,
    initialState,
  );

  const fieldError = (name: string) =>
    state?.fieldErrors?.[name] ? (
      <p className="text-sm text-destructive mt-1">
        {state.fieldErrors[name]}
      </p>
    ) : null;

  return (
    <form action={formAction} className="space-y-5 max-w-lg">
      <div className="space-y-2">
        <Label htmlFor="email">{t("email")}</Label>
        <Input id="email" value={email} disabled />
        <p className="text-xs text-muted-foreground">{t("emailHint")}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">{t("role")}</Label>
        <Input id="role" value={roleLabel} disabled />
        <p className="text-xs text-muted-foreground">{t("roleHint")}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="fullName">
          {t("fullName")} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="fullName"
          name="fullName"
          required
          defaultValue={fullName ?? ""}
        />
        {fieldError("fullName")}
      </div>

      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? t("saving") : t("save")}
      </Button>
    </form>
  );
}
