import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { catalogActivities } from "@/lib/db/schema";
import { requireProfile } from "@/lib/dal";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

const FAMILY_ORDER: Array<"wild" | "hive" | "multi"> = [
  "wild",
  "hive",
  "multi",
];
const FAMILY_LABELS: Record<string, string> = {
  wild: "🌿 Wild — outdoor",
  hive: "🏢 Hive — indoor",
  multi: "🌄 Multi-dia — retreats",
};

export default async function LibraryIndexPage() {
  await requireProfile();
  const t = await getTranslations("library");

  const rows = await db
    .select({
      id: catalogActivities.id,
      code: catalogActivities.code,
      name: catalogActivities.name,
      tagline: catalogActivities.tagline,
      family: catalogActivities.family,
      durationLabel: catalogActivities.durationLabel,
      paxMin: catalogActivities.paxMin,
      paxMax: catalogActivities.paxMax,
      pricePerPaxMin: catalogActivities.pricePerPaxMin,
      pricePerPaxMax: catalogActivities.pricePerPaxMax,
      sortOrder: catalogActivities.sortOrder,
    })
    .from(catalogActivities)
    .where(and(eq(catalogActivities.isActive, true)))
    .orderBy(
      asc(catalogActivities.family),
      asc(catalogActivities.sortOrder),
      asc(catalogActivities.name),
    );

  const byFamily = new Map<string, typeof rows>();
  for (const f of FAMILY_ORDER) byFamily.set(f, [] as typeof rows);
  for (const r of rows) byFamily.get(r.family)?.push(r);

  function fmtPax(min: number | null, max: number | null): string {
    if (min == null && max == null) return "";
    if (min != null && max != null) return `${min}–${max} pax`;
    return `${min ?? max} pax`;
  }
  function fmtPrice(min: number | null, max: number | null): string {
    if (min == null && max == null) return "";
    if (min != null && max != null) return `${min}–${max}€/pax`;
    return `${min ?? max}€/pax`;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 space-y-10">
      <div>
        <h1 className="font-display text-4xl sm:text-6xl text-foreground leading-none">
          {t("title")}
        </h1>
        <p className="mt-2 text-base text-muted-foreground">{t("subtitle")}</p>
      </div>

      {rows.length === 0 ? (
        <EmptyState title={t("empty")} description={t("emptyDescription")} />
      ) : (
        FAMILY_ORDER.map((f) => {
          const items = byFamily.get(f) ?? [];
          if (items.length === 0) return null;
          return (
            <section key={f} className="space-y-4">
              <h2 className="font-display text-2xl text-foreground">
                {FAMILY_LABELS[f]}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((a) => (
                  <Link
                    key={a.id}
                    href={`/library/${a.code}`}
                    className="block group"
                  >
                    <Card className="h-full transition-colors group-hover:border-accent">
                      <CardContent className="p-6 flex flex-col gap-3 h-full">
                        <h3 className="font-medium text-lg text-foreground">
                          {a.name}
                        </h3>
                        {a.tagline && (
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {a.tagline}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-auto pt-3 text-xs text-muted-foreground">
                          {a.durationLabel && (
                            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5">
                              {a.durationLabel}
                            </span>
                          )}
                          {fmtPax(a.paxMin, a.paxMax) && (
                            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5">
                              {fmtPax(a.paxMin, a.paxMax)}
                            </span>
                          )}
                          {fmtPrice(a.pricePerPaxMin, a.pricePerPaxMax) && (
                            <span className="inline-flex items-center rounded-full bg-accent/30 px-2 py-0.5 text-foreground tabular-nums">
                              {fmtPrice(a.pricePerPaxMin, a.pricePerPaxMax)}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
