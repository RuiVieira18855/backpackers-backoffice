"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createTemplate,
  type TemplateFormState,
} from "./actions";

const SCOPES = [
  "contact_note",
  "event_description",
  "project_description",
  "deal_description",
  "task_description",
  "doc_description",
  "generic",
] as const;

type Pillar = { id: string; name: string };

type Prefill = {
  id: string;
  name: string;
  body: string;
  scope: (typeof SCOPES)[number];
  pillarId: string | null;
};

type Props = {
  pillars: Pillar[];
  template?: Prefill;
  /** Provided when editing — wraps updateTemplate with the id. */
  onSave?: (
    state: TemplateFormState | undefined,
    formData: FormData,
  ) => Promise<TemplateFormState>;
};

const initialState: TemplateFormState = {};

export function TemplateForm({ pillars, template, onSave }: Props) {
  const t = useTranslations("admin.templates.form");
  const tScopes = useTranslations("admin.templates.scopes");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const action = onSave ?? createTemplate;
  const [state, formAction, pending] = useActionState(action, initialState);

  const fieldError = (name: string) =>
    state?.fieldErrors?.[name] ? (
      <p className="text-sm text-destructive mt-1">
        {state.fieldErrors[name]}
      </p>
    ) : null;

  return (
    <form
      action={(fd) => {
        formAction(fd);
        if (!template) router.push("/admin/templates");
      }}
      className="space-y-6"
    >
      <div className="space-y-2">
        <Label htmlFor="name">
          {t("name")} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={template?.name ?? ""}
        />
        {fieldError("name")}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="scope">{t("scope")}</Label>
          <select
            id="scope"
            name="scope"
            defaultValue={template?.scope ?? "generic"}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
          >
            {SCOPES.map((s) => (
              <option key={s} value={s}>
                {tScopes(s)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="pillarId">{t("pillar")}</Label>
          <select
            id="pillarId"
            name="pillarId"
            defaultValue={template?.pillarId ?? ""}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
          >
            <option value="">{t("anyPillar")}</option>
            {pillars.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="body">
          {t("body")} <span className="text-destructive">*</span>
        </Label>
        <textarea
          id="body"
          name="body"
          rows={10}
          required
          defaultValue={template?.body ?? ""}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs font-mono"
        />
        <p className="text-xs text-muted-foreground">{t("bodyHint")}</p>
        {fieldError("body")}
      </div>

      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? t("saving") : t("save")}
        </Button>
        <Button asChild variant="ghost">
          <Link href="/admin/templates">{tCommon("cancel")}</Link>
        </Button>
      </div>
    </form>
  );
}
