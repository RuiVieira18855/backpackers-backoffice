import Link from "next/link";
import { ChevronLeft, Plus } from "lucide-react";
import { asc } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { templates } from "@/lib/db/schema";
import { getAllPillars, requireSkill } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TemplatesTable } from "./templates-table";

export default async function TemplatesAdminPage() {
  await requireSkill("admin");
  const t = await getTranslations("admin.templates");

  const [rows, allPillars] = await Promise.all([
    db.select().from(templates).orderBy(asc(templates.scope), asc(templates.name)),
    getAllPillars(),
  ]);

  const pillarById = new Map(allPillars.map((p) => [p.id, p]));

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-10 py-10 space-y-8">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
            <Link href="/admin/users">
              <ChevronLeft className="mr-1 h-4 w-4" />
              {t("backToAdmin")}
            </Link>
          </Button>
          <h1 className="font-display text-5xl text-foreground leading-none">
            {t("title")}
          </h1>
          <p className="mt-2 text-base text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button asChild>
          <Link href="/admin/templates/new">
            <Plus className="mr-2 h-4 w-4" />
            {t("newTemplate")}
          </Link>
        </Button>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">{t("empty")}</p>
            <Button asChild className="mt-6">
              <Link href="/admin/templates/new">
                <Plus className="mr-2 h-4 w-4" />
                {t("newTemplate")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <TemplatesTable
          rows={rows.map((r) => ({
            id: r.id,
            name: r.name,
            scope: r.scope,
            pillarName: r.pillarId
              ? (pillarById.get(r.pillarId)?.name ?? null)
              : null,
            preview: r.body.slice(0, 120),
          }))}
        />
      )}
    </div>
  );
}
