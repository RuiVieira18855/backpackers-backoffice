"use client";

import { useActionState } from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateOwnProfile, type SettingsState } from "./actions";

const initialState: SettingsState = {};

type Pillar = { id: string; name: string };

type Props = {
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  defaultPillarId: string | null;
  roleLabel: string;
  pillars: Pillar[];
};

export function ProfileForm({
  email,
  fullName,
  avatarUrl,
  defaultPillarId,
  roleLabel,
  pillars,
}: Props) {
  const t = useTranslations("settings");
  const tTheme = useTranslations("settings.theme");
  const { theme, setTheme } = useTheme();

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
    <div className="space-y-10 max-w-lg">
      <form action={formAction} className="space-y-5">
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

        <div className="space-y-2">
          <Label htmlFor="defaultPillarId">{t("defaultPillar")}</Label>
          <select
            id="defaultPillarId"
            name="defaultPillarId"
            defaultValue={defaultPillarId ?? ""}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
          >
            <option value="">{t("noDefault")}</option>
            {pillars.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            {t("defaultPillarHint")}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="avatar">{t("avatar")}</Label>
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              className="h-16 w-16 rounded-full object-cover border border-border"
            />
          ) : null}
          <input
            id="avatar"
            name="avatar"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="block w-full text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground hover:file:bg-primary/90"
          />
          <p className="text-xs text-muted-foreground">{t("avatarHint")}</p>
          {fieldError("avatar")}
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

      <section className="space-y-3 border-t border-border pt-8">
        <h2 className="text-sm uppercase tracking-wider text-muted-foreground">
          {tTheme("section")}
        </h2>
        <p className="text-xs text-muted-foreground">{tTheme("hint")}</p>
        <div className="flex gap-2">
          {(["light", "dark", "system"] as const).map((opt) => (
            <Button
              key={opt}
              type="button"
              variant={theme === opt ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme(opt)}
            >
              {tTheme(opt)}
            </Button>
          ))}
        </div>
      </section>
    </div>
  );
}
