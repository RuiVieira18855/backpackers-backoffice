"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, Eye, EyeOff, Pencil, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { deleteAdventure, setAdventureStatus } from "./actions";

type Row = {
  id: string;
  slug: string;
  title: string;
  type: "adventure" | "synergy-open" | "workshop" | "retreat";
  location: string;
  startsAt: Date | null;
  plannedMonth: string | null;
  status: "draft" | "published" | "archived";
};

const MONTHS_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const STATUS_CLASS: Record<Row["status"], string> = {
  published: "bg-accent/40 text-foreground",
  draft: "bg-muted text-muted-foreground",
  archived: "bg-muted text-muted-foreground line-through",
};

const STATUS_TEXT: Record<Row["status"], string> = {
  published: "Publicado",
  draft: "Rascunho",
  archived: "Arquivado",
};

export function AdventureRows({
  rows,
  typeLabels,
}: {
  rows: Row[];
  typeLabels: Record<string, string>;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function onDelete(id: string, title: string) {
    const ok = await confirm({
      title: `Apagar "${title}"?`,
      description:
        "Apagar remove a caminhada do site e do histórico. Para tirar da agenda mantendo a página viva, arquiva em vez de apagar.",
      destructive: true,
    });
    if (!ok) return;
    startTransition(async () => {
      await deleteAdventure(id);
      toast.info(`"${title}" apagada.`);
      router.refresh();
    });
  }

  function onStatus(id: string, status: Row["status"], message: string) {
    startTransition(async () => {
      await setAdventureStatus(id, status);
      toast.info(message);
      router.refresh();
    });
  }

  function whenLabel(r: Row): string {
    if (r.startsAt) {
      return new Date(r.startsAt).toLocaleDateString("pt-PT", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Europe/Lisbon",
      });
    }
    if (r.plannedMonth) {
      const [year, month] = r.plannedMonth.split("-");
      const idx = Math.max(0, Math.min(11, Number(month) - 1));
      return `${MONTHS_PT[idx]} ${year} · a confirmar`;
    }
    return "Data a confirmar";
  }

  return (
    <table className="w-full text-sm">
      <thead className="border-b border-border bg-muted/30">
        <tr className="text-left">
          <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
            Tipo
          </th>
          <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
            Caminhada
          </th>
          <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
            Quando
          </th>
          <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
            Estado
          </th>
          <th className="px-4 py-3" />
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {rows.map((r) => {
          const isPublished = r.status === "published";
          const isArchived = r.status === "archived";
          return (
            <tr key={r.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 text-muted-foreground text-xs">
                {typeLabels[r.type] ?? r.type}
              </td>
              <td className="px-4 py-3">
                <Link href={`/admin/adventures/${r.id}`} className="block group">
                  <span className="font-medium text-foreground group-hover:underline">
                    {r.title}
                  </span>
                  <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                    {r.slug}
                  </span>
                  {r.location && (
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      {r.location}
                    </span>
                  )}
                </Link>
              </td>
              <td className="px-4 py-3 text-muted-foreground text-xs tabular-nums">
                {whenLabel(r)}
              </td>
              <td className="px-4 py-3 text-xs">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 ${STATUS_CLASS[r.status]}`}
                >
                  {STATUS_TEXT[r.status]}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      onStatus(
                        r.id,
                        isPublished ? "draft" : "published",
                        isPublished
                          ? `"${r.title}" passou a rascunho.`
                          : `"${r.title}" publicada.`,
                      )
                    }
                    disabled={pending}
                    aria-label={isPublished ? "Despublicar" : "Publicar"}
                  >
                    {isPublished ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      onStatus(
                        r.id,
                        isArchived ? "published" : "archived",
                        isArchived
                          ? `"${r.title}" voltou à agenda.`
                          : `"${r.title}" arquivada. A página continua online.`,
                      )
                    }
                    disabled={pending}
                    aria-label={isArchived ? "Repor na agenda" : "Arquivar"}
                  >
                    {isArchived ? (
                      <Undo2 className="h-3.5 w-3.5" />
                    ) : (
                      <Archive className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button asChild variant="ghost" size="sm">
                    <Link
                      href={`/admin/adventures/${r.id}`}
                      aria-label="Editar"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(r.id, r.title)}
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
