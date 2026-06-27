"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TemplatePicker } from "@/components/templates/template-picker";
import type { TemplateOption } from "@/lib/templates";
import {
  CustomFieldsSection,
  type CustomFieldDef,
} from "@/components/custom-fields/fields-section";

const STAGES = [
  "lead",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
] as const;

export type DealFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

type Pillar = { id: string; name: string };
type Contact = { id: string; fullName: string; company: string | null };

type DealPrefill = {
  id: string;
  name: string;
  pillarId: string;
  contactId: string | null;
  stage: (typeof STAGES)[number];
  value: string | null;
  currency: string;
  expectedCloseDate: string | null;
  description: string | null;
  notes: string | null;
};

type Props = {
  pillars: Pillar[];
  contacts: Contact[];
  deal?: DealPrefill;
  defaultContactId?: string;
  defaultStage?: (typeof STAGES)[number];
  descriptionTemplates?: TemplateOption[];
  customFieldDefs?: CustomFieldDef[];
  customFieldValues?: Record<string, string | number | null>;
  action: (
    state: DealFormState | undefined,
    formData: FormData,
  ) => Promise<DealFormState>;
};

const initialState: DealFormState = {};

export function DealForm({
  pillars,
  contacts,
  deal,
  defaultContactId,
  defaultStage,
  descriptionTemplates = [],
  customFieldDefs = [],
  customFieldValues = {},
  action,
}: Props) {
  const t = useTranslations("deals.form");
  const tStages = useTranslations("deals.stages");
  const tCommon = useTranslations("common");
  const tDetail = useTranslations("deals.detail");

  const mode = deal ? "edit" : "create";
  const [state, formAction, pending] = useActionState(action, initialState);

  const fieldError = (name: string) =>
    state?.fieldErrors?.[name] ? (
      <p className="text-sm text-destructive mt-1">
        {state.fieldErrors[name]}
      </p>
    ) : null;

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      {deal && <input type="hidden" name="id" value={deal.id} />}

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name">
            {t("name")} <span className="text-destructive">*</span>
          </Label>
          <Input id="name" name="name" required defaultValue={deal?.name ?? ""} />
          {fieldError("name")}
        </div>

        <div className="space-y-2">
          <Label htmlFor="pillarId">
            {t("pillar")} <span className="text-destructive">*</span>
          </Label>
          <select
            id="pillarId"
            name="pillarId"
            required
            defaultValue={deal?.pillarId ?? ""}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
          >
            <option value="" disabled>
              {t("selectPlaceholder")}
            </option>
            {pillars.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {fieldError("pillarId")}
        </div>

        <div className="space-y-2">
          <Label htmlFor="stage">{t("stage")}</Label>
          <select
            id="stage"
            name="stage"
            defaultValue={deal?.stage ?? defaultStage ?? "lead"}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
          >
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {tStages(s)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="value">{t("value")}</Label>
          <div className="flex gap-2">
            <Input
              id="value"
              name="value"
              type="number"
              step="0.01"
              min="0"
              defaultValue={deal?.value ?? ""}
              className="flex-1"
            />
            <select
              name="currency"
              defaultValue={deal?.currency ?? "EUR"}
              className="h-9 w-20 rounded-md border border-input bg-background px-2 text-sm shadow-xs"
            >
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="expectedCloseDate">{t("expectedClose")}</Label>
          <Input
            id="expectedCloseDate"
            name="expectedCloseDate"
            type="date"
            defaultValue={deal?.expectedCloseDate ?? ""}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="contactId">{t("contact")}</Label>
          <select
            id="contactId"
            name="contactId"
            defaultValue={deal?.contactId ?? defaultContactId ?? ""}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
          >
            <option value="">{t("contactNone")}</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName}
                {c.company ? ` · ${c.company}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="description">{t("description")}</Label>
            <TemplatePicker
              templates={descriptionTemplates}
              targetId="description"
            />
          </div>
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={deal?.description ?? ""}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs"
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notes">{t("notes")}</Label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={deal?.notes ?? ""}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs"
          />
        </div>

        <CustomFieldsSection
          defs={customFieldDefs}
          values={customFieldValues}
          heading={tDetail("customFields")}
        />
      </div>

      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {mode === "edit"
            ? pending
              ? tDetail("saving")
              : tDetail("save")
            : pending
              ? t("creating")
              : t("create")}
        </Button>
        <Button asChild variant="ghost">
          <Link href={mode === "edit" && deal ? `/crm/deals/${deal.id}` : "/crm/deals"}>
            {tCommon("cancel")}
          </Link>
        </Button>
      </div>
    </form>
  );
}
