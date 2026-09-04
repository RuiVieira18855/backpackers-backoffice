import Link from "next/link";
import { ChevronLeft, Plus } from "lucide-react";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { herbariumSpecies } from "@/lib/db/schema";
import { requireRole } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { STATUS_LABELS, TAG_LABELS } from "./constants";

const DANGER_DOT = ["bg-emerald-500", "bg-amber-500", "bg-red-500", "bg-red-700"];

export default async function AdminHerbariumPage() {
  await requireRole("admin_grupo");

  const rows = await db
    .select({
      slug: herbariumSpecies.slug,
      scientificName: herbariumSpecies.scientificName,
      namePt: herbariumSpecies.namePt,
      family: herbariumSpecies.family,
      tags: herbariumSpecies.tags,
      danger: herbariumSpecies.danger,
      status: herbariumSpecies.status,
      updatedAt: herbariumSpecies.updatedAt,
    })
    .from(herbariumSpecies)
    .orderBy(asc(herbariumSpecies.namePt));

  const published = rows.filter((r) => r.status === "published").length;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6 sm:py-10 md:px-10">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-4">
          <Link href="/admin">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Voltar ao admin
          </Link>
        </Button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-4xl leading-none text-foreground sm:text-6xl">
              Herbarium
            </h1>
            <p className="mt-2 text-base text-muted-foreground">
              Fichas de flora ibérica. Alimentam o guia de campo e o deck Flora do
              Trailhead. Publicar actualiza o site de imediato.
            </p>
            <p className="mt-1 text-sm text-muted-foreground tabular-nums">
              {published} publicadas de {rows.length}
            </p>
          </div>
          <Button asChild>
            <Link href="/admin/herbarium/new">
              <Plus className="mr-2 h-4 w-4" />
              Nova ficha
            </Link>
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Ainda não há fichas"
          description="Cria a primeira, ou corre o script de importação da semente (scripts/seed-herbarium.mjs)."
          action={{ label: "Nova ficha", href: "/admin/herbarium/new" }}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {rows.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`/admin/herbarium/${r.slug}`}
                    className="flex flex-wrap items-center gap-3 px-4 py-3 transition hover:bg-muted/50 sm:px-6"
                  >
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${DANGER_DOT[r.danger] ?? DANGER_DOT[0]}`}
                      title={`Risco ${r.danger}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{r.namePt ?? r.slug}</span>
                      <span className="block truncate text-sm italic text-muted-foreground">
                        {r.scientificName} · {r.family}
                      </span>
                    </span>
                    <span className="hidden gap-1 sm:flex">
                      {r.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground"
                        >
                          {TAG_LABELS[t as keyof typeof TAG_LABELS] ?? t}
                        </span>
                      ))}
                    </span>
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      {STATUS_LABELS[r.status as keyof typeof STATUS_LABELS] ?? r.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
