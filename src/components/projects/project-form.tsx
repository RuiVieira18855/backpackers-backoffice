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

const STATUSES = [
  "planned",
  "active",
  "on_hold",
  "completed",
  "cancelled",
] as const;

export type ProjectFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

type Pillar = { id: string; name: string };
type Contact = { id: string; fullName: string; company: string | null };

type ProjectPrefill = {
  id: string;
  name: string;
  pillarId: string;
  status: (typeof STATUSES)[number];
  description: string | null;
  clientContactId: string | null;
  startDate: string | null;
  targetDate: string | null;
  notes: string | null;
};

type Props = {
  pillars: Pillar[];
  contacts: Contact[];
  project?: ProjectPrefill;
  /** Pre-fill client contact when creating (e.g. ?client=contactId) */
  defaultClientContactId?: string;
  descriptionTemplates?: TemplateOption[];
  customFieldDefs?: CustomFieldDef[];
  customFieldValues?: Record<string, string | number | null>;
  action: (
    state: ProjectFormState | undefined,
    formData: FormData,
  ) => Promise<ProjectFormState>;
};

const initialState: ProjectFormState = {};

export function ProjectForm({
  pillars,
  contacts,
  project,
  defaultClientContactId,
  descriptionTemplates = [],
  customFieldDefs = [],
  customFieldValues = {},
  action,
}: Props) {
  const t = useTranslations("ops.projects.form");
  const tStatuses = useTranslations("ops.projectStatuses");
  const tCommon = useTranslations("common");
  const tDetail = useTranslations("ops.projects.detail");

  const mode = project ? "edit" : "create";
  const [state, formAction, pending] = useActionState(action, initialState);

  const fieldError = (name: string) =>
    state?.fieldErrors?.[name] ? (
      <p className="text-sm text-destructive mt-1">
        {state.fieldErrors[name]}
      </p>
    ) : null;

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      {project && <input type="hidden" name="id" value={project.id} />}

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name">
            {t("name")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={project?.name ?? ""}
          />
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
            defaultValue={project?.pillarId ?? ""}
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
          <Label htmlFor="status">{t("status")}</Label>
          <select
            id="status"
            name="status"
            defaultValue={project?.status ?? "planned"}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
          >
            {STATUSES.map((st) => (
              <option key={st} value={st}>
                {tStatuses(st)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="startDate">{t("startDate")}</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={project?.startDate ?? ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="targetDate">{t("targetDate")}</Label>
          <Input
            id="targetDate"
            name="targetDate"
            type="date"
            defaultValue={project?.targetDate ?? ""}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="clientContactId">{t("clientContact")}</Label>
          <select
            id="clientContactId"
            name="clientContactId"
            defaultValue={project?.clientContactId ?? defaultClientContactId ?? ""}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
          >
            <option value="">{t("clientContactNone")}</option>
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
            defaultValue={project?.description ?? ""}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs"
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notes">{t("notes")}</Label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={project?.notes ?? ""}
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
          <Link
            href={
              mode === "edit" && project
                ? `/ops/projects/${project.id}`
                : "/ops/projects"
            }
          >
            {tCommon("cancel")}
          </Link>
        </Button>
      </div>
    </form>
  );
}
