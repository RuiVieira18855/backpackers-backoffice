"use client";

import { useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, MapPlus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { createEventFromTrail } from "./actions";
import { TrailHero } from "@/components/trail-hero";

export type TrailRowData = {
  id: string;
  nome: string;
  codigo: string | null;
  concelho: string | null;
  regiao: string | null;
  distanciaKm: string | null;
  dificuldade: number | null;
  limiteGrupo: number | null;
  viagemLeiriaMin: number | null;
  potencial: string | null;
  estado: string;
  avisos: string | null;
  confianca: string;
};

const ESTADO_CLASS: Record<string, string> = {
  "por triar": "bg-muted text-muted-foreground",
  ideia: "bg-muted text-foreground",
  "a reconhecer": "bg-accent/30 text-foreground",
  reconhecido: "bg-accent/40 text-foreground",
  "ficha operacional": "bg-accent/60 text-foreground",
  "activo no site": "bg-accent text-foreground",
};

/** Avisos que impedem mesmo de fazer o percurso, não apenas cuidados a ter. */
function bloqueado(avisos: string | null): boolean {
  return Boolean(avisos && /ardid|encerrado|desaconselhad|não deve/i.test(avisos));
}

export function TrailRows({ rows }: { rows: TrailRowData[] }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();

  async function onCreate(r: TrailRowData) {
    if (bloqueado(r.avisos)) {
      const ok = await confirm({
        title: `"${r.nome}" tem um aviso activo`,
        description: `${r.avisos}\n\nCriar a caminhada mesmo assim?`,
        destructive: true,
      });
      if (!ok) return;
    }
    startTransition(async () => {
      toast.info(`A criar rascunho a partir de "${r.nome}"...`);
      await createEventFromTrail(r.id);
    });
  }

  return (
    <table className="w-full text-sm">
      <thead className="border-b border-border bg-muted/30">
        <tr className="text-left">
          <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
            Trilho
          </th>
          <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
            Perfil
          </th>
          <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
            De Leiria
          </th>
          <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
            Estado
          </th>
          <th className="px-4 py-3" />
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {rows.map((r) => (
          <tr key={r.id} className="hover:bg-muted/30 transition-colors">
            <td className="px-4 py-3">
              <Link href={`/admin/trails/${r.id}`} className="flex gap-3 group">
                {/* Miniatura gerada: 501 linhas de texto puro são ilegíveis. */}
                <TrailHero
                  seed={r.id}
                  className="h-10 w-16 shrink-0 rounded border border-border"
                />
                <span className="min-w-0">
                <span className="font-medium text-foreground group-hover:underline">
                  {r.nome}
                </span>
                {r.codigo && (
                  <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                    {r.codigo}
                  </span>
                )}
                <span className="block text-xs text-muted-foreground mt-0.5">
                  {[r.concelho, r.regiao].filter(Boolean).join(" · ")}
                </span>
                </span>
              </Link>
              {r.avisos && (
                <span
                  className={`mt-1 flex items-start gap-1 text-[11px] ${
                    bloqueado(r.avisos) ? "text-destructive" : "text-muted-foreground"
                  }`}
                >
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                  {r.avisos}
                </span>
              )}
            </td>
            <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
              {r.distanciaKm ? `${Number(r.distanciaKm)} km` : "—"}
              {r.dificuldade ? ` · ${r.dificuldade}/5` : ""}
              {r.limiteGrupo ? (
                <span className="block text-[11px] text-destructive">
                  máx. {r.limiteGrupo} pax
                </span>
              ) : null}
            </td>
            <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
              {r.viagemLeiriaMin === null ? "—" : `${r.viagemLeiriaMin} min`}
            </td>
            <td className="px-4 py-3 text-xs">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 ${
                  ESTADO_CLASS[r.estado] ?? "bg-muted text-muted-foreground"
                }`}
              >
                {r.estado}
              </span>
              {r.potencial && (
                <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">
                  {r.potencial}
                </span>
              )}
              {r.confianca !== "alta" && (
                <span className="block text-[10px] text-muted-foreground mt-0.5">
                  confiança {r.confianca}
                </span>
              )}
            </td>
            <td className="px-4 py-3 text-right">
              <div className="flex items-center justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCreate(r)}
                  disabled={pending}
                  title="Criar caminhada a partir deste trilho"
                >
                  <MapPlus className="mr-1 h-3.5 w-3.5" />
                  Criar caminhada
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/admin/trails/${r.id}`} aria-label="Editar">
                    <Pencil className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
