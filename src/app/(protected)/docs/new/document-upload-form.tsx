"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  uploadDocument,
  type UploadDocumentState,
} from "./actions";

const TYPES = ["procedure", "contract", "report", "portfolio", "other"] as const;

type Pillar = { id: string; name: string };
type LinkedEvent = { id: string; name: string };
type LinkedProject = { id: string; name: string };

type Props = {
  pillars: Pillar[];
  events?: LinkedEvent[];
  projects?: LinkedProject[];
  defaultEventId?: string;
  defaultProjectId?: string;
  defaultPillarId?: string;
  lockContext?: boolean;
  returnTo?: string;
};

const initialState: UploadDocumentState = {};

export function DocumentUploadForm({
  pillars,
  events = [],
  projects = [],
  defaultEventId,
  defaultProjectId,
  defaultPillarId,
  lockContext,
  returnTo,
}: Props) {
  const t = useTranslations("docs.form");
  const tTypes = useTranslations("docs.types");
  const tCommon = useTranslations("common");

  const [state, formAction, pending] = useActionState(
    uploadDocument,
    initialState,
  );

  const fieldError = (name: string) =>
    state?.fieldErrors?.[name] ? (
      <p className="text-sm text-destructive mt-1">
        {state.fieldErrors[name]}
      </p>
    ) : null;

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}

      <div className="space-y-2">
        <Label htmlFor="file">
          {t("file")} <span className="text-destructive">*</span>
        </Label>
        <input
          id="file"
          name="file"
          type="file"
          required
          className="block w-full text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground hover:file:bg-primary/90"
        />
        <p className="text-xs text-muted-foreground">{t("fileHint")}</p>
        {fieldError("file")}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="title">
            {t("title")} <span className="text-destructive">*</span>
          </Label>
          <Input id="title" name="title" required />
          {fieldError("title")}
        </div>

        <div className="space-y-2">
          <Label htmlFor="pillarId">
            {t("pillar")} <span className="text-destructive">*</span>
          </Label>
          <select
            id="pillarId"
            name="pillarId"
            required
            defaultValue={defaultPillarId ?? ""}
            disabled={lockContext && !!defaultPillarId}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs disabled:opacity-60"
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
          <Label htmlFor="type">{t("type")}</Label>
          <select
            id="type"
            name="type"
            defaultValue="other"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
          >
            {TYPES.map((tp) => (
              <option key={tp} value={tp}>
                {tTypes(tp)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="eventId">{t("event")}</Label>
          <select
            id="eventId"
            name="eventId"
            defaultValue={defaultEventId ?? ""}
            disabled={lockContext && !!defaultEventId}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs disabled:opacity-60"
          >
            <option value="">{t("eventNone")}</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="projectId">{t("project")}</Label>
          <select
            id="projectId"
            name="projectId"
            defaultValue={defaultProjectId ?? ""}
            disabled={lockContext && !!defaultProjectId}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs disabled:opacity-60"
          >
            <option value="">{t("projectNone")}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">{t("description")}</Label>
          <textarea
            id="description"
            name="description"
            rows={3}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs"
          />
        </div>
      </div>

      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? t("uploading") : t("upload")}
        </Button>
        <Button asChild variant="ghost">
          <Link href={returnTo ?? "/docs"}>{tCommon("cancel")}</Link>
        </Button>
      </div>
    </form>
  );
}
