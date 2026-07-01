"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateApp, type UpdateAppState } from "../actions";

type Props = {
  appKey: string;
  defaults: {
    name: string;
    description: string | null;
    icon: string | null;
    url: string | null;
  };
};

const initialState: UpdateAppState = {};

export function AppMetadataForm({ appKey, defaults }: Props) {
  const t = useTranslations("admin.apps.metadata");
  const router = useRouter();
  const boundAction = updateApp.bind(null, appKey);
  const [state, formAction, pending] = useActionState(
    boundAction,
    initialState,
  );

  const fieldError = (name: string) =>
    state?.fieldErrors?.[name] ? (
      <p className="text-sm text-destructive mt-1">
        {state.fieldErrors[name]}
      </p>
    ) : null;

  return (
    <form
      action={async (fd) => {
        formAction(fd);
        setTimeout(() => router.refresh(), 100);
      }}
      className="space-y-4"
    >
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label htmlFor="name">
            {t("name")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={defaults.name}
          />
          {fieldError("name")}
        </div>
        <div className="space-y-2">
          <Label htmlFor="icon">{t("icon")}</Label>
          <Input
            id="icon"
            name="icon"
            defaultValue={defaults.icon ?? ""}
            placeholder="Map"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="url">{t("url")}</Label>
          <Input
            id="url"
            name="url"
            type="url"
            defaultValue={defaults.url ?? ""}
            placeholder="https://app.example.com"
          />
        </div>
        <div className="space-y-2 sm:col-span-3">
          <Label htmlFor="description">{t("description")}</Label>
          <Input
            id="description"
            name="description"
            defaultValue={defaults.description ?? ""}
          />
        </div>
      </div>

      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? t("saving") : t("save")}
      </Button>
    </form>
  );
}
