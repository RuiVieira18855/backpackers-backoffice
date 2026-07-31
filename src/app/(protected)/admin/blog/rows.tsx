"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { deleteBlogPost, toggleBlogPostPublished } from "./actions";

type Row = {
  id: string;
  slug: string;
  title: string;
  pillar: "bwa" | "adventures" | "synergy" | "labs";
  category: string;
  status: "draft" | "published";
  publishedAt: Date | null;
  updatedAt: Date;
};

export function BlogRows({
  rows,
  pillarLabels,
}: {
  rows: Row[];
  pillarLabels: Record<string, string>;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function onDelete(id: string, title: string) {
    const ok = await confirm({
      title: `Apagar "${title}"?`,
      destructive: true,
    });
    if (!ok) return;
    startTransition(async () => {
      await deleteBlogPost(id);
      toast.info(`"${title}" apagado.`);
      router.refresh();
    });
  }

  async function onToggle(id: string, isPublished: boolean, title: string) {
    startTransition(async () => {
      await toggleBlogPostPublished(id, !isPublished);
      toast.info(
        isPublished
          ? `"${title}" passou a rascunho.`
          : `"${title}" publicado.`,
      );
      router.refresh();
    });
  }

  function fmtDate(d: Date | null): string {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("pt-PT", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <table className="w-full text-sm">
      <thead className="border-b border-border bg-muted/30">
        <tr className="text-left">
          <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
            Pilar
          </th>
          <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
            Título
          </th>
          <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
            Data
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
          return (
            <tr key={r.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 text-muted-foreground text-xs">
                {pillarLabels[r.pillar] ?? r.pillar}
              </td>
              <td className="px-4 py-3">
                <Link href={`/admin/blog/${r.id}`} className="block group">
                  <span className="font-medium text-foreground group-hover:underline">
                    {r.title}
                  </span>
                  <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                    {r.slug}
                  </span>
                  {r.category && (
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      {r.category}
                    </span>
                  )}
                </Link>
              </td>
              <td className="px-4 py-3 text-muted-foreground text-xs tabular-nums">
                {fmtDate(r.publishedAt ?? r.updatedAt)}
              </td>
              <td className="px-4 py-3 text-xs">
                {isPublished ? (
                  <span className="inline-flex items-center rounded-full bg-accent/40 px-2 py-0.5 text-foreground">
                    Publicado
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                    Rascunho
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggle(r.id, isPublished, r.title)}
                    disabled={pending}
                    aria-label={isPublished ? "Despublicar" : "Publicar"}
                  >
                    {isPublished ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/admin/blog/${r.id}`} aria-label="Editar">
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
