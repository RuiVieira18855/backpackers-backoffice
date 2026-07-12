import Link from "next/link";
import { ChevronLeft, Plus } from "lucide-react";
import { asc } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { catalogActivities } from "@/lib/db/schema";
import { requireRole } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { CatalogRows } from "./rows";

const FAMILY_LABELS: Record<string, string> = {
  wild: "🌿 Wild",
  hive: "🏢 Hive",
  multi: "🌄 Multi-dia",
};

export default async function AdminCatalogPage() {
  await requireRole("admin_grupo");
  const t = await getTranslations("admin.catalog");

  const rows = await db
    .select({
      id: catalogActivities.id,
      code: catalogActivities.code,
      name: catalogActivities.name,
      tagline: catalogActivities.tagline,
      family: catalogActivities.family,
      pricePerPaxMin: catalogActivities.pricePerPaxMin,
      pricePerPaxMax: catalogActivities.pricePerPaxMax,
      isActive: catalogActivities.isActive,
      sortOrder: catalogActivities.sortOrder,
      updatedAt: catalogActivities.updatedAt,
    })
    .from(catalogActivities)
    .orderBy(
      asc(catalogActivities.family),
      asc(catalogActivities.sortOrder),
      asc(catalogActivities.name),
    );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
          <Link href="/admin">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("backToAdmin")}
          </Link>
        </Button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-4xl sm:text-6xl text-foreground leading-none">
              {t("title")}
            </h1>
            <p className="mt-2 text-base text-muted-foreground">
              {t("subtitle")}
            </p>
          </div>
          <Button asChild>
            <Link href="/admin/catalog/new">
              <Plus className="mr-2 h-4 w-4" />
              {t("newActivity")}
            </Link>
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title={t("empty")}
          description={t("emptyDescription")}
          action={{ label: t("newActivity"), href: "/admin/catalog/new" }}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <CatalogRows rows={rows} familyLabels={FAMILY_LABELS} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
