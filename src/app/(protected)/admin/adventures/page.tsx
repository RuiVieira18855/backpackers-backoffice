import Link from "next/link";
import { ChevronLeft, Plus } from "lucide-react";
import { asc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { siteEvents } from "@/lib/db/schema";
import { requireRole } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { AdventureRows } from "./rows";
import { EVENT_TYPE_LABELS } from "./regions";

export default async function AdminAdventuresPage() {
  await requireRole("admin_grupo");

  const rows = await db
    .select({
      id: siteEvents.id,
      slug: siteEvents.slug,
      title: siteEvents.title,
      type: siteEvents.type,
      location: siteEvents.location,
      startsAt: siteEvents.startsAt,
      plannedMonth: siteEvents.plannedMonth,
      status: siteEvents.status,
    })
    .from(siteEvents)
    // Arquivadas para o fim; dentro de cada grupo, as mais próximas primeiro.
    .orderBy(
      sql`CASE ${siteEvents.status} WHEN 'published' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END`,
      asc(sql`COALESCE(${siteEvents.startsAt}::date::text, ${siteEvents.plannedMonth})`),
      asc(siteEvents.title),
    );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
          <Link href="/admin">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Voltar ao admin
          </Link>
        </Button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-4xl sm:text-6xl text-foreground leading-none">
              Caminhadas
            </h1>
            <p className="mt-2 text-base text-muted-foreground">
              A agenda pública do site. Publicar ou arquivar actualiza o site
              automaticamente.
            </p>
          </div>
          <Button asChild>
            <Link href="/admin/adventures/new">
              <Plus className="mr-2 h-4 w-4" />
              Nova caminhada
            </Link>
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Ainda não há caminhadas"
          description="Cria a primeira caminhada da agenda pública."
          action={{ label: "Nova caminhada", href: "/admin/adventures/new" }}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <AdventureRows rows={rows} typeLabels={EVENT_TYPE_LABELS} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
