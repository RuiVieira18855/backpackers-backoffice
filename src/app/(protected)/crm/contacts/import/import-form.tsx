"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  commitImport,
  previewImport,
  type ImportContactsState,
} from "./actions";

type Pillar = { id: string; name: string };

const initialState: ImportContactsState = {};

export function ImportContactsForm({ pillars }: { pillars: Pillar[] }) {
  const t = useTranslations("crm.import");
  const tCommon = useTranslations("common");

  const [previewState, previewAction, previewPending] = useActionState(
    previewImport,
    initialState,
  );
  const [commitState, commitFormAction, commitPending] = useActionState(
    commitImport,
    initialState,
  );

  const preview = previewState?.preview;
  const error = previewState?.error ?? commitState?.error;

  if (!preview) {
    return (
      <form action={previewAction} className="space-y-6 max-w-2xl">
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
              {t("pillarPlaceholder")}
            </option>
            {pillars.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="file">
            {t("file")} <span className="text-destructive">*</span>
          </Label>
          <input
            id="file"
            name="file"
            type="file"
            accept=".csv,text/csv"
            required
            className="block w-full text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground hover:file:bg-primary/90"
          />
          <p className="text-xs text-muted-foreground">{t("fileHint")}</p>
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={previewPending}>
            {previewPending ? t("analysing") : t("preview")}
          </Button>
          <Button asChild variant="ghost">
            <Link href="/crm">{tCommon("cancel")}</Link>
          </Button>
        </div>
      </form>
    );
  }

  const dupSet = new Set(preview.duplicates);
  const newCount = preview.rows.filter(
    (r) => !r.email || !dupSet.has(r.email),
  ).length;

  return (
    <form action={commitFormAction} className="space-y-6">
      <input type="hidden" name="pillarId" value={preview.pillarId} />
      <input type="hidden" name="payload" value={JSON.stringify(preview.rows)} />

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="rounded-md border border-border p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {t("previewTotal")}
          </p>
          <p className="font-display text-3xl text-foreground mt-1">
            {preview.rows.length}
          </p>
        </div>
        <div className="rounded-md border border-border p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {t("previewNew")}
          </p>
          <p className="font-display text-3xl text-foreground mt-1">
            {newCount}
          </p>
        </div>
        <div className="rounded-md border border-border p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {t("previewDuplicates")}
          </p>
          <p className="font-display text-3xl text-foreground mt-1">
            {preview.duplicates.length}
          </p>
        </div>
      </div>

      {preview.skipped > 0 && (
        <p className="text-xs text-muted-foreground">
          {t("skippedRows", { count: preview.skipped })}
        </p>
      )}

      <div className="rounded-md border border-border overflow-hidden">
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30 sticky top-0">
              <tr className="text-left">
                <th className="px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground">
                  {t("col.name")}
                </th>
                <th className="px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground">
                  {t("col.email")}
                </th>
                <th className="px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground">
                  {t("col.company")}
                </th>
                <th className="px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground">
                  {t("col.type")}
                </th>
                <th className="px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground">
                  {t("col.stage")}
                </th>
                <th className="px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground">
                  {t("col.status")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {preview.rows.slice(0, 200).map((r, i) => {
                const isDup = r.email && dupSet.has(r.email);
                return (
                  <tr
                    key={i}
                    className={isDup ? "bg-destructive/5 text-muted-foreground" : ""}
                  >
                    <td className="px-3 py-2 text-foreground">{r.fullName}</td>
                    <td className="px-3 py-2">{r.email ?? "—"}</td>
                    <td className="px-3 py-2">{r.company ?? "—"}</td>
                    <td className="px-3 py-2">{r.type}</td>
                    <td className="px-3 py-2">{r.stage}</td>
                    <td className="px-3 py-2 text-xs">
                      {isDup ? (
                        <span className="text-destructive">{t("dup")}</span>
                      ) : (
                        <span className="text-accent-foreground">
                          {t("new")}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {preview.rows.length > 200 && (
          <p className="text-xs text-muted-foreground px-3 py-2 border-t border-border">
            {t("truncated", { shown: 200, total: preview.rows.length })}
          </p>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={commitPending || newCount === 0}>
          {commitPending
            ? t("importing")
            : t("importCount", { count: newCount })}
        </Button>
        <Button asChild variant="ghost">
          <Link href="/crm/contacts/import">{t("startOver")}</Link>
        </Button>
      </div>
    </form>
  );
}
