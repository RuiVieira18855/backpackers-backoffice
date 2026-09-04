import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { herbariumSpecies } from "@/lib/db/schema";
import { requireRole } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import { SpeciesForm, type SpeciesFormValues } from "../species-form";

const SITE =
  process.env.HERBARIUM_SITE_URL ?? "https://herbarium.backpackersworldadventures.com";

export default async function EditSpeciesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireRole("admin_grupo");
  const { slug } = await params;

  const [row] = await db
    .select()
    .from(herbariumSpecies)
    .where(eq(herbariumSpecies.slug, slug))
    .limit(1);
  if (!row) notFound();

  const values: SpeciesFormValues = {
    slug: row.slug,
    scientificName: row.scientificName,
    family: row.family,
    namePt: row.namePt ?? "",
    nameEn: row.nameEn ?? "",
    nameEs: row.nameEs ?? "",
    akaPt: row.akaPt.join(", "),
    akaEn: row.akaEn.join(", "),
    akaEs: row.akaEs.join(", "),
    habitat: row.habitat,
    monthsFlower: row.monthsFlower.join(", "),
    monthsFruit: row.monthsFruit.join(", "),
    tags: row.tags,
    danger: row.danger,
    summaryPt: row.summaryPt ?? "",
    summaryEn: row.summaryEn ?? "",
    summaryEs: row.summaryEs ?? "",
    fieldMarksPt: row.fieldMarksPt ?? "",
    fieldMarksEn: row.fieldMarksEn ?? "",
    fieldMarksEs: row.fieldMarksEs ?? "",
    usesPt: row.usesPt ?? "",
    usesEn: row.usesEn ?? "",
    usesEs: row.usesEs ?? "",
    legalNotePt: row.legalNotePt ?? "",
    legalNoteEn: row.legalNoteEn ?? "",
    legalNoteEs: row.legalNoteEs ?? "",
    lookalikes: JSON.stringify(row.lookalikes, null, 2),
    images: JSON.stringify(row.images, null, 2),
    sources: JSON.stringify(row.sources, null, 2),
    status: row.status,
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 sm:py-10 md:px-10">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-4">
          <Link href="/admin/herbarium">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Voltar ao Herbarium
          </Link>
        </Button>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-4xl leading-none text-foreground sm:text-5xl">
              {row.namePt ?? row.slug}
            </h1>
            <p className="mt-1 text-base italic text-muted-foreground">
              {row.scientificName}
            </p>
          </div>
          {row.status === "published" && (
            <Button asChild variant="ghost" size="sm">
              <a href={`${SITE}/plantas/${row.slug}`} target="_blank" rel="noreferrer">
                Ver no site
                <ExternalLink className="ml-1 h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </div>
      <SpeciesForm species={values} />
    </div>
  );
}
