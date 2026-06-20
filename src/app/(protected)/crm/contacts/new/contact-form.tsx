"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createContact, type CreateContactState } from "./actions";

const initialState: CreateContactState = {};

const TYPES = ["lead", "customer", "partner", "vendor"] as const;
const STAGES = [
  "new",
  "qualified",
  "active",
  "on_hold",
  "closed_won",
  "closed_lost",
] as const;
const SOURCES = [
  "website",
  "referral",
  "event",
  "inbound",
  "cold",
  "other",
] as const;

type Pillar = { id: string; name: string };

export function ContactForm({ pillars }: { pillars: Pillar[] }) {
  const t = useTranslations("crm.form");
  const tTypes = useTranslations("crm.types");
  const tStages = useTranslations("crm.stages");
  const tSources = useTranslations("crm.sources");
  const tCommon = useTranslations("common");

  const [state, formAction, pending] = useActionState(
    createContact,
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
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="fullName">
            {t("fullName")} <span className="text-destructive">*</span>
          </Label>
          <Input id="fullName" name="fullName" required />
          {fieldError("fullName")}
        </div>

        <div className="space-y-2">
          <Label htmlFor="pillarId">
            {t("pillar")} <span className="text-destructive">*</span>
          </Label>
          <select
            id="pillarId"
            name="pillarId"
            required
            defaultValue=""
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
          <p className="text-xs text-muted-foreground">{t("pillarHint")}</p>
          {fieldError("pillarId")}
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">{t("type")}</Label>
          <select
            id="type"
            name="type"
            defaultValue="lead"
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
          <Label htmlFor="stage">{t("stage")}</Label>
          <select
            id="stage"
            name="stage"
            defaultValue="new"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
          >
            {STAGES.map((st) => (
              <option key={st} value={st}>
                {tStages(st)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="source">{t("source")}</Label>
          <select
            id="source"
            name="source"
            defaultValue=""
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
          >
            <option value="">{t("selectPlaceholder")}</option>
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {tSources(s)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{t("email")}</Label>
          <Input id="email" name="email" type="email" autoComplete="off" />
          {fieldError("email")}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">{t("phone")}</Label>
          <Input id="phone" name="phone" type="tel" autoComplete="off" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="company">{t("company")}</Label>
          <Input id="company" name="company" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="jobTitle">{t("jobTitle")}</Label>
          <Input id="jobTitle" name="jobTitle" />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notes">{t("notes")}</Label>
          <textarea
            id="notes"
            name="notes"
            rows={4}
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
          {pending ? t("creating") : t("create")}
        </Button>
        <Button asChild variant="ghost">
          <Link href="/crm">{tCommon("cancel")}</Link>
        </Button>
      </div>
    </form>
  );
}
