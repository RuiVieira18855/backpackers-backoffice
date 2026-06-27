"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { deleteTemplate } from "./actions";

type Row = {
  id: string;
  name: string;
  scope: string;
  pillarName: string | null;
  preview: string;
};

export function TemplatesTable({ rows }: { rows: Row[] }) {
  const t = useTranslations("admin.templates");
  const tScopes = useTranslations("admin.templates.scopes");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleDelete = (id: string, name: string) => {
    if (!confirm(t("deleteConfirm", { name }))) return;
    startTransition(async () => {
      await deleteTemplate(id);
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
                {t("col.name")}
              </th>
              <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
                {t("col.scope")}
              </th>
              <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
                {t("col.pillar")}
              </th>
              <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
                {t("col.preview")}
              </th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/templates/${r.id}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {r.name}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full bg-accent/40 px-2 py-0.5 text-xs">
                    {tScopes(r.scope as never)}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {r.pillarName ?? t("anyPillar")}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-md">
                  {r.preview}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => handleDelete(r.id, r.name)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
