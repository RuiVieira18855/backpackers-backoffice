"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Tag, Trash2, UserCheck, Workflow, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { SortableHeader } from "@/components/sortable-header";
import { Button } from "@/components/ui/button";
import {
  bulkAddTag,
  bulkAssignOwner,
  bulkDeleteContacts,
  bulkUpdateContactStage,
} from "@/app/(protected)/crm/actions";

const STAGES = [
  "new",
  "qualified",
  "active",
  "on_hold",
  "closed_won",
  "closed_lost",
] as const;

export type OwnerOption = { id: string; label: string };

export type ContactRow = {
  id: string;
  fullName: string;
  jobTitle: string | null;
  type: "lead" | "customer" | "partner" | "vendor";
  stage:
    | "new"
    | "qualified"
    | "active"
    | "on_hold"
    | "closed_won"
    | "closed_lost";
  pillarName: string | null;
  company: string | null;
  email: string | null;
};

type Props = {
  rows: ContactRow[];
  spForHeaders: Record<string, string | undefined>;
  canBulkDelete: boolean;
  /** Owners the current user can pick from (typically all internal users). */
  owners: OwnerOption[];
};

export function ContactsBulkBar({
  rows,
  spForHeaders,
  canBulkDelete,
  owners,
}: Props) {
  const t = useTranslations("crm");
  const tStages = useTranslations("crm.stages");
  const tTypes = useTranslations("crm.types");
  const tBulk = useTranslations("bulk");
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r.id));

  const toggleAll = () => {
    setSelected((cur) => {
      const next = new Set(cur);
      if (allOnPage) rows.forEach((r) => next.delete(r.id));
      else rows.forEach((r) => next.add(r.id));
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const handleBulkDelete = () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const confirmMsg = tBulk("deleteConfirm", { count: ids.length });
    if (!confirm(confirmMsg)) return;
    startTransition(async () => {
      const res = await bulkDeleteContacts(ids);
      if (res.ok) {
        clearSelection();
        router.refresh();
      } else {
        alert(res.error ?? "Error");
      }
    });
  };

  const handleBulkStage = (stage: string) => {
    const ids = Array.from(selected);
    if (ids.length === 0 || !stage) return;
    startTransition(async () => {
      const res = await bulkUpdateContactStage(ids, stage);
      if (res.ok) {
        clearSelection();
        router.refresh();
      } else {
        alert(res.error ?? "Error");
      }
    });
  };

  const handleBulkOwner = (ownerId: string) => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    startTransition(async () => {
      const res = await bulkAssignOwner(ids, ownerId);
      if (res.ok) {
        clearSelection();
        router.refresh();
      } else {
        alert(res.error ?? "Error");
      }
    });
  };

  const handleBulkTag = () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const tag = window.prompt(tBulk("addTagPrompt"), "");
    if (!tag) return;
    startTransition(async () => {
      const res = await bulkAddTag(ids, tag);
      if (res.ok) {
        clearSelection();
        router.refresh();
      } else {
        alert(res.error ?? "Error");
      }
    });
  };

  return (
    <>
      {selected.size > 0 && (
        <div className="sticky top-16 z-20 flex items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-2 shadow-sm">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              aria-label={tBulk("clear")}
            >
              <X className="h-4 w-4" />
            </Button>
            <span className="text-sm text-foreground">
              {tBulk("selected", { count: selected.size })}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              <Workflow className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                disabled={pending}
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkStage(e.target.value);
                    e.currentTarget.value = "";
                  }
                }}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs shadow-xs"
                aria-label={tBulk("stagePickerLabel")}
                defaultValue=""
              >
                <option value="" disabled>
                  {tBulk("changeStage")}
                </option>
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {tStages(s)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                disabled={pending}
                onChange={(e) => {
                  handleBulkOwner(e.target.value);
                  e.currentTarget.value = "";
                }}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs shadow-xs"
                aria-label={tBulk("ownerPickerLabel")}
                defaultValue=""
              >
                <option value="" disabled>
                  {tBulk("assignOwner")}
                </option>
                <option value="">— {tBulk("unassign")} —</option>
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={handleBulkTag}
            >
              <Tag className="mr-2 h-3.5 w-3.5" />
              {tBulk("addTag")}
            </Button>
            {canBulkDelete && (
              <Button
                variant="destructive"
                size="sm"
                disabled={pending}
                onClick={handleBulkDelete}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                {pending ? tBulk("deleting") : tBulk("delete")}
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/30">
            <tr className="text-left">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allOnPage}
                  onChange={toggleAll}
                  aria-label={tBulk("selectAll")}
                  className="h-4 w-4 rounded border-input"
                />
              </th>
              <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                <SortableHeader
                  basePath="/crm"
                  searchParams={spForHeaders}
                  column="fullName"
                >
                  {t("table.name")}
                </SortableHeader>
              </th>
              <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                <SortableHeader
                  basePath="/crm"
                  searchParams={spForHeaders}
                  column="type"
                >
                  {t("table.type")}
                </SortableHeader>
              </th>
              <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                <SortableHeader
                  basePath="/crm"
                  searchParams={spForHeaders}
                  column="stage"
                >
                  {t("table.stage")}
                </SortableHeader>
              </th>
              <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                {t("table.pillar")}
              </th>
              <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                <SortableHeader
                  basePath="/crm"
                  searchParams={spForHeaders}
                  column="company"
                >
                  {t("table.company")}
                </SortableHeader>
              </th>
              <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                <SortableHeader
                  basePath="/crm"
                  searchParams={spForHeaders}
                  column="email"
                >
                  {t("table.email")}
                </SortableHeader>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((c) => {
              const checked = selected.has(c.id);
              return (
                <tr
                  key={c.id}
                  className={`hover:bg-muted/30 transition-colors ${
                    checked ? "bg-accent/10" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleOne(c.id)}
                      aria-label={tBulk("selectRow")}
                      className="h-4 w-4 rounded border-input"
                    />
                  </td>
                  <td className="px-4 py-0">
                    <Link
                      href={`/crm/contacts/${c.id}`}
                      className="block px-0 py-3"
                    >
                      <div className="font-medium text-foreground">
                        {c.fullName}
                      </div>
                      {c.jobTitle && (
                        <div className="text-xs text-muted-foreground">
                          {c.jobTitle}
                        </div>
                      )}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <Link
                      href={`/crm/contacts/${c.id}`}
                      className="block py-3 -my-3"
                    >
                      {tTypes(c.type)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/crm/contacts/${c.id}`}
                      className="inline-flex items-center rounded-full bg-accent/40 px-2 py-0.5 text-xs text-foreground"
                    >
                      {tStages(c.stage)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <Link
                      href={`/crm/contacts/${c.id}`}
                      className="block py-3 -my-3"
                    >
                      {c.pillarName ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <Link
                      href={`/crm/contacts/${c.id}`}
                      className="block py-3 -my-3"
                    >
                      {c.company ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <Link
                      href={`/crm/contacts/${c.id}`}
                      className="block py-3 -my-3"
                    >
                      {c.email ?? "—"}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
