"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import {
  deleteCatalogActivity,
  toggleCatalogActivityActive,
} from "./actions";

type Row = {
  id: string;
  code: string;
  name: string;
  tagline: string | null;
  family: "wild" | "hive" | "multi";
  pricePerPaxMin: number | null;
  pricePerPaxMax: number | null;
  isActive: boolean;
  sortOrder: number;
  updatedAt: Date;
};

export function CatalogRows({
  rows,
  familyLabels,
}: {
  rows: Row[];
  familyLabels: Record<string, string>;
}) {
  const t = useTranslations("admin.catalog");
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function onDelete(id: string, name: string) {
    const ok = await confirm({
      title: t("deleteConfirm", { name }),
      destructive: true,
    });
    if (!ok) return;
    startTransition(async () => {
      await deleteCatalogActivity(id);
      toast.info(t("deletedToast", { name }));
      router.refresh();
    });
  }

  async function onToggle(id: string, currentlyActive: boolean, name: string) {
    startTransition(async () => {
      await toggleCatalogActivityActive(id, !currentlyActive);
      toast.info(
        currentlyActive
          ? t("hiddenToast", { name })
          : t("shownToast", { name }),
      );
      router.refresh();
    });
  }

  function fmtPrice(min: number | null, max: number | null): string {
    if (min == null && max == null) return "—";
    if (min != null && max != null) return `${min}–${max}€/pax`;
    return `${min ?? max}€/pax`;
  }

  return (
    <table className="w-full text-sm">
      <thead className="border-b border-border bg-muted/30">
        <tr className="text-left">
          <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
            {t("col.family")}
          </th>
          <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
            {t("col.name")}
          </th>
          <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
            {t("col.price")}
          </th>
          <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
            {t("col.status")}
          </th>
          <th className="px-4 py-3" />
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {rows.map((r) => (
          <tr key={r.id} className="hover:bg-muted/30 transition-colors">
            <td className="px-4 py-3 text-muted-foreground text-xs">
              {familyLabels[r.family] ?? r.family}
            </td>
            <td className="px-4 py-3">
              <Link
                href={`/admin/catalog/${r.id}`}
                className="block group"
              >
                <span className="font-medium text-foreground group-hover:underline">
                  {r.name}
                </span>
                <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                  {r.code}
                </span>
                {r.tagline && (
                  <span className="block text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {r.tagline}
                  </span>
                )}
              </Link>
            </td>
            <td className="px-4 py-3 text-muted-foreground text-xs tabular-nums">
              {fmtPrice(r.pricePerPaxMin, r.pricePerPaxMax)}
            </td>
            <td className="px-4 py-3 text-xs">
              {r.isActive ? (
                <span className="inline-flex items-center rounded-full bg-accent/40 px-2 py-0.5 text-foreground">
                  {t("statusActive")}
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                  {t("statusHidden")}
                </span>
              )}
            </td>
            <td className="px-4 py-3 text-right">
              <div className="flex items-center justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggle(r.id, r.isActive, r.name)}
                  disabled={pending}
                  aria-label={r.isActive ? t("hide") : t("show")}
                >
                  {r.isActive ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link
                    href={`/admin/catalog/${r.id}`}
                    aria-label={t("edit", { name: r.name })}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(r.id, r.name)}
                  disabled={pending}
                  className="text-destructive hover:text-destructive"
                  aria-label={t("delete", { name: r.name })}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
