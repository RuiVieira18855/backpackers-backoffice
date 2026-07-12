import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Pencil } from "lucide-react";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { catalogActivities } from "@/lib/db/schema";
import { requireProfile } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const FAMILY_LABELS: Record<string, string> = {
  wild: "🌿 Wild — outdoor",
  hive: "🏢 Hive — indoor",
  multi: "🌄 Multi-dia — retreats",
};

type Props = { params: Promise<{ code: string }> };

export default async function LibraryDetailPage({ params }: Props) {
  const profile = await requireProfile();
  const { code } = await params;
  const t = await getTranslations("library");

  const activity = await db.query.catalogActivities.findFirst({
    where: eq(catalogActivities.code, code),
    with: { pillar: true },
  });
  if (!activity) notFound();

  const canEdit =
    profile.role === "super_user" || profile.role === "admin_grupo";

  function fmtRange(
    min: number | null,
    max: number | null,
    suffix = "",
  ): string {
    if (min == null && max == null) return "—";
    if (min != null && max != null) return `${min}–${max}${suffix}`;
    return `${min ?? max}${suffix}`;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
          <Link href="/library">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("backToList")}
          </Link>
        </Button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              {FAMILY_LABELS[activity.family] ?? activity.family}
            </p>
            <h1 className="font-display text-4xl sm:text-5xl text-foreground leading-none">
              {activity.name}
            </h1>
            {activity.tagline && (
              <p className="mt-3 text-base text-muted-foreground">
                {activity.tagline}
              </p>
            )}
          </div>
          {canEdit && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/catalog/${activity.id}`}>
                <Pencil className="mr-2 h-3.5 w-3.5" />
                {t("editCta")}
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-6 grid gap-4 sm:grid-cols-2 md:grid-cols-4 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
              {t("field.duration")}
            </p>
            <p className="font-medium text-foreground">
              {activity.durationLabel ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
              {t("field.pax")}
            </p>
            <p className="font-medium text-foreground tabular-nums">
              {fmtRange(activity.paxMin, activity.paxMax)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
              {t("field.pricePerPax")}
            </p>
            <p className="font-medium text-foreground tabular-nums">
              {fmtRange(activity.pricePerPaxMin, activity.pricePerPaxMax, "€")}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
              {t("field.priceTarget")}
            </p>
            <p className="font-medium text-foreground tabular-nums">
              {fmtRange(activity.priceTargetMin, activity.priceTargetMax, "€")}
            </p>
          </div>
          {activity.targetAudience && (
            <div className="sm:col-span-2 md:col-span-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                {t("field.audience")}
              </p>
              <p className="font-medium text-foreground">
                {activity.targetAudience}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {activity.body && activity.body.trim().length > 0 && (
        <Card>
          <CardContent className="p-6 prose prose-sm max-w-none dark:prose-invert">
            <pre className="whitespace-pre-wrap text-sm text-foreground font-sans leading-relaxed">
              {activity.body}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
