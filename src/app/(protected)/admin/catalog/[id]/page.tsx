import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { catalogActivities } from "@/lib/db/schema";
import { getAllPillars, requireRole } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import { CatalogActivityForm } from "../activity-form";

type Props = { params: Promise<{ id: string }> };

export default async function EditCatalogActivityPage({ params }: Props) {
  await requireRole("admin_grupo");
  const { id } = await params;
  const t = await getTranslations("admin.catalog");

  const activity = await db.query.catalogActivities.findFirst({
    where: eq(catalogActivities.id, id),
  });
  if (!activity) notFound();

  const pillars = await getAllPillars();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
          <Link href="/admin/catalog">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("backToList")}
          </Link>
        </Button>
        <h1 className="font-display text-4xl sm:text-5xl text-foreground leading-none">
          {activity.name}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground font-mono">
          {activity.code}
        </p>
      </div>
      <CatalogActivityForm
        activity={{
          id: activity.id,
          code: activity.code,
          name: activity.name,
          tagline: activity.tagline,
          family: activity.family,
          pillarId: activity.pillarId,
          durationLabel: activity.durationLabel,
          paxMin: activity.paxMin,
          paxMax: activity.paxMax,
          priceTargetMin: activity.priceTargetMin,
          priceTargetMax: activity.priceTargetMax,
          pricePerPaxMin: activity.pricePerPaxMin,
          pricePerPaxMax: activity.pricePerPaxMax,
          targetAudience: activity.targetAudience,
          body: activity.body,
          sortOrder: activity.sortOrder,
        }}
        pillars={pillars.map((p) => ({ id: p.id, name: p.name }))}
      />
    </div>
  );
}
