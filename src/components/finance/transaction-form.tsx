"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const TYPES = ["income", "expense"] as const;
const STATUSES = ["pending", "paid", "overdue", "cancelled"] as const;

export type TransactionFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

type Pillar = { id: string; name: string };
type LinkedEvent = { id: string; name: string };
type LinkedProject = { id: string; name: string };

type TransactionPrefill = {
  id: string;
  type: (typeof TYPES)[number];
  category: string | null;
  amount: string;
  currency: string;
  description: string;
  date: string;
  invoiceNumber: string | null;
  vendor: string | null;
  status: (typeof STATUSES)[number];
  dueDate: string | null;
  pillarId: string | null;
  eventId: string | null;
  projectId: string | null;
  notes: string | null;
};

type Props = {
  pillars: Pillar[];
  events?: LinkedEvent[];
  projects?: LinkedProject[];
  transaction?: TransactionPrefill;
  defaultType?: (typeof TYPES)[number];
  defaultEventId?: string;
  defaultProjectId?: string;
  defaultPillarId?: string;
  /** Locks the pillar/event/project fields (when invoked from event/project detail) */
  lockContext?: boolean;
  /** When set, the server action redirects here on success instead of /finance/:id */
  returnTo?: string;
  action: (
    state: TransactionFormState | undefined,
    formData: FormData,
  ) => Promise<TransactionFormState>;
};

const initialState: TransactionFormState = {};

export function TransactionForm({
  pillars,
  events = [],
  projects = [],
  transaction,
  defaultType,
  defaultEventId,
  defaultProjectId,
  defaultPillarId,
  lockContext,
  returnTo,
  action,
}: Props) {
  const t = useTranslations("finance.form");
  const tTypes = useTranslations("finance.types");
  const tStatuses = useTranslations("finance.statuses");
  const tCommon = useTranslations("common");
  const tDetail = useTranslations("finance.detail");

  const mode = transaction ? "edit" : "create";
  const [state, formAction, pending] = useActionState(action, initialState);

  const fieldError = (name: string) =>
    state?.fieldErrors?.[name] ? (
      <p className="text-sm text-destructive mt-1">
        {state.fieldErrors[name]}
      </p>
    ) : null;

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      {transaction && <input type="hidden" name="id" value={transaction.id} />}
      {returnTo && (
        <input type="hidden" name="returnTo" value={returnTo} />
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">
            {t("type")} <span className="text-destructive">*</span>
          </Label>
          <select
            id="type"
            name="type"
            required
            defaultValue={transaction?.type ?? defaultType ?? "expense"}
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
          <Label htmlFor="amount">
            {t("amount")} <span className="text-destructive">*</span>
          </Label>
          <div className="flex gap-2">
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={transaction?.amount ?? ""}
              className="flex-1"
            />
            <select
              name="currency"
              defaultValue={transaction?.currency ?? "EUR"}
              className="h-9 w-20 rounded-md border border-input bg-background px-2 text-sm shadow-xs"
            >
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
          {fieldError("amount")}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">
            {t("description")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="description"
            name="description"
            required
            defaultValue={transaction?.description ?? ""}
          />
          {fieldError("description")}
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">{t("category")}</Label>
          <Input
            id="category"
            name="category"
            defaultValue={transaction?.category ?? ""}
            placeholder={t("categoryPlaceholder")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">{t("status")}</Label>
          <select
            id="status"
            name="status"
            defaultValue={transaction?.status ?? "pending"}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {tStatuses(s)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="date">
            {t("date")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={
              transaction?.date ?? new Date().toISOString().slice(0, 10)
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dueDate">{t("dueDate")}</Label>
          <Input
            id="dueDate"
            name="dueDate"
            type="date"
            defaultValue={transaction?.dueDate ?? ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pillarId">{t("pillar")}</Label>
          <select
            id="pillarId"
            name="pillarId"
            defaultValue={
              transaction?.pillarId ?? defaultPillarId ?? ""
            }
            disabled={lockContext && !!defaultPillarId}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs disabled:opacity-60"
          >
            <option value="">{t("pillarNone")}</option>
            {pillars.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="invoiceNumber">{t("invoiceNumber")}</Label>
          <Input
            id="invoiceNumber"
            name="invoiceNumber"
            defaultValue={transaction?.invoiceNumber ?? ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="eventId">{t("event")}</Label>
          <select
            id="eventId"
            name="eventId"
            defaultValue={transaction?.eventId ?? defaultEventId ?? ""}
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
            defaultValue={transaction?.projectId ?? defaultProjectId ?? ""}
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
          <Label htmlFor="vendor">{t("vendor")}</Label>
          <Input
            id="vendor"
            name="vendor"
            defaultValue={transaction?.vendor ?? ""}
            placeholder={t("vendorPlaceholder")}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notes">{t("notes")}</Label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={transaction?.notes ?? ""}
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
            href={
              mode === "edit" && transaction
                ? `/finance/${transaction.id}`
                : "/finance"
            }
          >
            {tCommon("cancel")}
          </Link>
        </Button>
      </div>
    </form>
  );
}
