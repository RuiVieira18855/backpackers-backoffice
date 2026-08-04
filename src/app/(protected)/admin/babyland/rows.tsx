"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import type { CollectionDef } from "@/lib/babyland/collections";
import { deleteBabylandDoc } from "./actions";

type Row = Record<string, unknown> & { id: string };

export function DocRows({
  colKey,
  def,
  rows,
}: {
  colKey: string;
  def: CollectionDef;
  rows: Row[];
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const hoje = new Date().toISOString().slice(0, 10);

  async function onDelete(id: string, title: string) {
    const ok = await confirm({ title: `Apagar "${title}"?`, destructive: true });
    if (!ok) return;
    startTransition(async () => {
      await deleteBabylandDoc(colKey, id);
      toast.info(`"${title}" apagado.`);
      router.refresh();
    });
  }

  function show(value: unknown): string {
    if (value === null || value === undefined || value === "") return "—";
    if (typeof value === "boolean") return value ? "Sim" : "—";
    return String(value);
  }

  return (
    <table className="w-full text-sm">
      <thead className="border-b border-border bg-muted/30">
        <tr className="text-left">
          <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
            {def.fields.find((f) => f.name === def.titleField)?.label ?? "Nome"}
          </th>
          {def.columns.map((c) => (
            <th
              key={c.name}
              className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground whitespace-nowrap"
            >
              {c.label}
            </th>
          ))}
          <th className="px-4 py-3" />
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {rows.map((r) => {
          const title = String(r[def.titleField] ?? "(sem título)");
          const passado =
            def.key === "eventos" && String(r.isoDate ?? "") < hoje;
          return (
            <tr
              key={r.id}
              className={`hover:bg-muted/30 transition-colors ${passado ? "opacity-50" : ""}`}
            >
              <td className="px-4 py-3">
                <Link
                  href={`/admin/babyland/${colKey}/${r.id}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {title}
                </Link>
                {passado && (
                  <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                    já passou, escondido na app
                  </span>
                )}
              </td>
              {def.columns.map((c) => (
                <td
                  key={c.name}
                  className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap"
                >
                  {show(r[c.name])}
                </td>
              ))}
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button asChild variant="ghost" size="sm">
                    <Link
                      href={`/admin/babyland/${colKey}/${r.id}`}
                      aria-label="Editar"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(r.id, title)}
                    disabled={pending}
                    className="text-destructive hover:text-destructive"
                    aria-label="Apagar"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
