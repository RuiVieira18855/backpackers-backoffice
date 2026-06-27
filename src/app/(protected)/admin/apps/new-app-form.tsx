"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createApp, type NewAppState } from "./actions";

const initialState: NewAppState = {};

export function NewAppForm() {
  const t = useTranslations("admin.apps.newForm");
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createApp, initialState);

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
          <Label htmlFor="key">
            {t("key")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="key"
            name="key"
            required
            pattern="[a-z][a-z0-9_-]*"
            placeholder="ex: foo-saas"
          />
          {fieldError("key")}
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">
            {t("name")} <span className="text-destructive">*</span>
          </Label>
          <Input id="name" name="name" required placeholder="ex: Foo SaaS" />
          {fieldError("name")}
        </div>
        <div className="space-y-2">
          <Label htmlFor="icon">{t("icon")}</Label>
          <Input id="icon" name="icon" placeholder="Boxes" />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">{t("description")}</Label>
          <Input id="description" name="description" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="url">{t("url")}</Label>
          <Input
            id="url"
            name="url"
            type="url"
            placeholder="https://app.example.com"
          />
        </div>
      </div>

      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} size="sm">
        <Plus className="mr-2 h-3.5 w-3.5" />
        {pending ? t("creating") : t("create")}
      </Button>
    </form>
  );
}
