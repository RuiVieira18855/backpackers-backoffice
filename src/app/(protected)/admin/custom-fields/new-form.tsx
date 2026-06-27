"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createCustomFieldDef,
  type CustomFieldFormState,
} from "./actions";

const ENTITIES = ["contact", "event", "project", "deal"] as const;
const TYPES = ["text", "textarea", "number", "date", "select"] as const;

const initialState: CustomFieldFormState = {};

export function NewCustomFieldForm() {
  const t = useTranslations("admin.customFields.form");
  const tEntities = useTranslations("admin.customFields.entities");
  const tTypes = useTranslations("admin.customFields.types");
  const router = useRouter();
  const [type, setType] = useState<(typeof TYPES)[number]>("text");
  const [state, formAction, pending] = useActionState(
    createCustomFieldDef,
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
        // refresh listing after submit
        setTimeout(() => router.refresh(), 100);
      }}
      className="space-y-4"
    >
      <div className="grid sm:grid-cols-4 gap-3">
        <div className="space-y-2">
          <Label htmlFor="entityType">{t("entityType")}</Label>
          <select
            id="entityType"
            name="entityType"
            defaultValue="contact"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
          >
            {ENTITIES.map((e) => (
              <option key={e} value={e}>
                {tEntities(e)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="key">
            {t("key")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="key"
            name="key"
            placeholder="ex: nif_fiscal"
            required
            pattern="[a-z][a-z0-9_]*"
          />
          {fieldError("key")}
        </div>

        <div className="space-y-2">
          <Label htmlFor="label">
            {t("label")} <span className="text-destructive">*</span>
          </Label>
          <Input id="label" name="label" placeholder="ex: NIF" required />
          {fieldError("label")}
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">{t("type")}</Label>
          <select
            id="type"
            name="type"
            value={type}
            onChange={(e) =>
              setType(e.target.value as (typeof TYPES)[number])
            }
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
          >
            {TYPES.map((tp) => (
              <option key={tp} value={tp}>
                {tTypes(tp)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {type === "select" && (
        <div className="space-y-2">
          <Label htmlFor="options">{t("options")}</Label>
          <Input
            id="options"
            name="options"
            placeholder={t("optionsHint")}
          />
        </div>
      )}

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="required" className="h-4 w-4 rounded border-input" />
          {t("required")}
        </label>
        <div className="flex items-center gap-2 text-sm">
          <Label htmlFor="sortOrder" className="text-xs text-muted-foreground">
            {t("sortOrder")}
          </Label>
          <Input
            id="sortOrder"
            name="sortOrder"
            type="number"
            defaultValue={0}
            className="h-8 w-20"
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
