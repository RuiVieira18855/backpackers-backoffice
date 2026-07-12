import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { getAllPillars, requireRole } from "@/lib/dal";
import { CatalogActivityForm } from "../activity-form";

export default async function NewCatalogActivityPage() {
  await requireRole("admin_grupo");
  const t = await getTranslations("admin.catalog");
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
          {t("newActivity")}
        </h1>
      </div>
      <CatalogActivityForm
        pillars={pillars.map((p) => ({ id: p.id, name: p.name }))}
      />
    </div>
  );
}
