import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, MapPlus } from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { trailLibrary } from "@/lib/db/schema";
import { requireRole } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import { TrailForm } from "../trail-form";
import { createEventFromTrail } from "../actions";

type Props = { params: Promise<{ id: string }> };

export default async function EditTrailPage({ params }: Props) {
  await requireRole("admin_grupo");
  const { id } = await params;

  const trail = await db.query.trailLibrary.findFirst({
    where: eq(trailLibrary.id, id),
  });
  if (!trail) notFound();

  const criar = createEventFromTrail.bind(null, trail.id);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
          <Link href="/admin/trails">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Voltar à biblioteca
          </Link>
        </Button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl text-foreground leading-none">
              {trail.nome}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground font-mono">
              {[trail.codigo, trail.concelho].filter(Boolean).join(" · ")}
            </p>
          </div>
          <form action={criar}>
            <Button type="submit" variant="secondary">
              <MapPlus className="mr-2 h-4 w-4" />
              Criar caminhada
            </Button>
          </form>
        </div>
      </div>

      <TrailForm
        trail={{
          id: trail.id,
          ref: trail.ref,
          nome: trail.nome,
          codigo: trail.codigo ?? "",
          rede: trail.rede ?? "",
          concelho: trail.concelho ?? "",
          distrito: trail.distrito ?? "",
          regiao: trail.regiao ?? "",
          areaProtegida: trail.areaProtegida ?? "",
          distanciaKm:
            trail.distanciaKm === null ? "" : String(Number(trail.distanciaKm)),
          tipo: trail.tipo ?? "",
          duracao: trail.duracao ?? "",
          dificuldade: trail.dificuldade === null ? "" : String(trail.dificuldade),
          tema: trail.tema ?? "",
          epoca: trail.epoca ?? "",
          autorizacao: trail.autorizacao ?? "",
          limiteGrupo: trail.limiteGrupo === null ? "" : String(trail.limiteGrupo),
          viagemLeiriaMin:
            trail.viagemLeiriaMin === null ? "" : String(trail.viagemLeiriaMin),
          potencial: trail.potencial ?? "",
          estado: trail.estado,
          avisos: trail.avisos ?? "",
          confianca: trail.confianca,
          fonte: trail.fonte ?? "",
          notas: trail.notas ?? "",
        }}
      />
    </div>
  );
}
