"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { deleteCustomFieldDef } from "./actions";
import { EditFieldDialog } from "./edit-dialog";

type Row = {
  id: string;
  entityType: "contact" | "event" | "project" | "deal";
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "date" | "select";
  options: string[];
  required: boolean;
  sortOrder: number;
};

export function CustomFieldsTable({ rows }: { rows: Row[] }) {
  const t = useTranslations("admin.customFields");
  const tEntities = useTranslations("admin.customFields.entities");
  const tTypes = useTranslations("admin.customFields.types");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleDelete = (id: string, label: string) => {
    if (!confirm(t("deleteConfirm", { name: label }))) return;
    startTransition(async () => {
      await deleteCustomFieldDef(id);
      router.refresh();
    });
  };

  return (
    <Card>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/30">
            <tr className="text-left">
              <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
                {t("col.entity")}
              </th>
              <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
                {t("col.key")}
              </th>
              <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
                {t("col.label")}
              </th>
              <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
                {t("col.type")}
              </th>
              <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
                {t("col.required")}
              </th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 text-muted-foreground">
                  {tEntities(r.entityType)}
                </td>
                <td className="px-4 py-3 font-mono text-xs">{r.key}</td>
                <td className="px-4 py-3 text-foreground">{r.label}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {tTypes(r.type)}
                  {r.type === "select" && r.options.length > 0 && (
                    <span className="block text-[10px] text-muted-foreground mt-0.5">
                      {r.options.join(", ")}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">
                  {r.required ? "✓" : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <EditFieldDialog row={r} />
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => handleDelete(r.id, r.label)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
