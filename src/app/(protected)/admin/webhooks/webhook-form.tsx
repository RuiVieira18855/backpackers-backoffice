"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { WebhookFormState } from "./actions";

const EVENTS = [
  "contact.created",
  "contact.stage_changed",
  "deal.won",
  "task.completed",
] as const;

type Props = {
  mode: "create" | "edit";
  defaults?: {
    name: string;
    url: string;
    events: string[];
    isActive: boolean;
  };
  action: (
    state: WebhookFormState | undefined,
    formData: FormData,
  ) => Promise<WebhookFormState>;
  onSaved?: string;
};

const initial: WebhookFormState = {};

export function WebhookForm({ mode, defaults, action, onSaved }: Props) {
  const t = useTranslations("admin.webhooks");
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, initial);
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(
    new Set(defaults?.events ?? []),
  );

  const toggle = (ev: string) => {
    setSelectedEvents((cur) => {
      const next = new Set(cur);
      if (next.has(ev)) next.delete(ev);
      else next.add(ev);
      return next;
    });
  };

  const fieldError = (name: string) =>
    state?.fieldErrors?.[name] ? (
      <p className="text-sm text-destructive mt-1">
        {state.fieldErrors[name]}
      </p>
    ) : null;

  return (
    <form
      action={async (fd) => {
        fd.delete("events");
        for (const ev of selectedEvents) fd.append("events", ev);
        formAction(fd);
        setTimeout(() => {
          if (onSaved) router.push(onSaved);
          else router.refresh();
        }, 100);
      }}
      className="space-y-6"
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">
            {t("form.name")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={defaults?.name ?? ""}
            placeholder={t("form.namePlaceholder")}
          />
          {fieldError("name")}
        </div>
        <div className="space-y-2">
          <Label htmlFor="url">
            {t("form.url")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="url"
            name="url"
            type="url"
            required
            defaultValue={defaults?.url ?? ""}
            placeholder="https://…"
          />
          {fieldError("url")}
        </div>
      </div>

      <fieldset className="border border-border rounded-md p-4 space-y-3">
        <legend className="text-sm font-medium px-2">{t("form.events")}</legend>
        <p className="text-xs text-muted-foreground">{t("form.eventsHint")}</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {EVENTS.map((ev) => (
            <label
              key={ev}
              className="flex items-center gap-2 text-sm border border-border rounded-md px-3 py-2 cursor-pointer hover:bg-muted/40"
            >
              <input
                type="checkbox"
                checked={selectedEvents.has(ev)}
                onChange={() => toggle(ev)}
                className="h-4 w-4 rounded border-input"
              />
              <span className="font-mono text-xs">{ev}</span>
            </label>
          ))}
        </div>
        {fieldError("events")}
      </fieldset>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={defaults?.isActive ?? true}
          className="h-4 w-4 rounded border-input"
        />
        {t("form.isActive")}
      </label>

      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending
            ? t("form.saving")
            : mode === "create"
              ? t("form.create")
              : t("form.save")}
        </Button>
        <Button asChild variant="ghost">
          <Link href="/admin/webhooks">{t("form.cancel")}</Link>
        </Button>
      </div>
    </form>
  );
}
