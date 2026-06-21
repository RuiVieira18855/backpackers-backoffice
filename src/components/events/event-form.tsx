"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const TYPES = [
  "tour",
  "team_building",
  "workshop",
  "meeting",
  "retreat",
  "other",
] as const;

const STATUSES = [
  "draft",
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export type EventFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

type Pillar = { id: string; name: string };
type Contact = { id: string; fullName: string; company: string | null };

type EventPrefill = {
  id: string;
  name: string;
  pillarId: string;
  type: (typeof TYPES)[number];
  status: (typeof STATUSES)[number];
  description: string | null;
  location: string | null;
  startAt: Date | null;
  endAt: Date | null;
  capacity: number | null;
  clientContactId: string | null;
  notes: string | null;
};

type Mode = "create" | "edit";

type Props = {
  pillars: Pillar[];
  contacts: Contact[];
  event?: EventPrefill;
  /** Pre-fill type when creating a new event (e.g. ?type=meeting) */
  defaultType?: (typeof TYPES)[number];
  action: (
    state: EventFormState | undefined,
    formData: FormData,
  ) => Promise<EventFormState>;
};

const initialState: EventFormState = {};

function toDatetimeLocal(d: Date | null): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export function EventForm({
  pillars,
  contacts,
  event,
  defaultType,
  action,
}: Props) {
  const t = useTranslations("ops.form");
  const tTypes = useTranslations("ops.eventTypes");
  const tStatuses = useTranslations("ops.eventStatuses");
  const tCommon = useTranslations("common");
  const tDetail = useTranslations("ops.detail");

  const mode: Mode = event ? "edit" : "create";
  const [state, formAction, pending] = useActionState(action, initialState);

  const fieldError = (name: string) =>
    state?.fieldErrors?.[name] ? (
      <p className="text-sm text-destructive mt-1">
        {state.fieldErrors[name]}
      </p>
    ) : null;

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      {event && <input type="hidden" name="id" value={event.id} />}

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name">
            {t("name")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={event?.name ?? ""}
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
            defaultValue={event?.pillarId ?? ""}
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
          <Label htmlFor="type">{t("type")}</Label>
          <select
            id="type"
            name="type"
            defaultValue={event?.type ?? defaultType ?? "other"}
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
          <Label htmlFor="status">{t("status")}</Label>
          <select
            id="status"
            name="status"
            defaultValue={event?.status ?? "draft"}
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
          <Label htmlFor="capacity">{t("capacity")}</Label>
          <Input
            id="capacity"
            name="capacity"
            type="number"
            min={0}
            defaultValue={event?.capacity ?? ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="startAt">{t("startAt")}</Label>
          <Input
            id="startAt"
            name="startAt"
            type="datetime-local"
            defaultValue={toDatetimeLocal(event?.startAt ?? null)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="endAt">{t("endAt")}</Label>
          <Input
            id="endAt"
            name="endAt"
            type="datetime-local"
            defaultValue={toDatetimeLocal(event?.endAt ?? null)}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="location">{t("location")}</Label>
          <Input
            id="location"
            name="location"
            defaultValue={event?.location ?? ""}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="clientContactId">{t("clientContact")}</Label>
          <select
            id="clientContactId"
            name="clientContactId"
            defaultValue={event?.clientContactId ?? ""}
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
          <p className="text-xs text-muted-foreground">
            {t("clientContactHint")}
          </p>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">{t("description")}</Label>
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={event?.description ?? ""}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs"
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notes">{t("notes")}</Label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={event?.notes ?? ""}
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
            href={mode === "edit" && event ? `/ops/events/${event.id}` : "/ops/events"}
          >
            {tCommon("cancel")}
          </Link>
        </Button>
      </div>
    </form>
  );
}
