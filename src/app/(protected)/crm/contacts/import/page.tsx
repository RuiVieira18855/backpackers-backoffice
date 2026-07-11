import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getAllPillars, requireRole } from "@/lib/dal";
import { ImportContactsForm } from "./import-form";

export default async function ImportContactsPage() {
  // CSV import is destructive enough to gate to admin_grupo+.
  await requireRole("admin_grupo");
  const t = await getTranslations("crm.import");
  const pillars = await getAllPillars();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
          <Link href="/crm">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("backToList")}
          </Link>
        </Button>
        <h1 className="font-display text-4xl sm:text-5xl text-foreground leading-none">
          {t("title")}
        </h1>
        <p className="mt-2 text-base text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card>
        <CardContent className="py-6 space-y-3 text-sm">
          <p className="font-medium text-foreground">{t("formatTitle")}</p>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>{t("formatColumns")}</li>
            <li>{t("formatRequired")}</li>
            <li>{t("formatDedup")}</li>
            <li>{t("formatLimit")}</li>
          </ul>
          <p className="text-xs text-muted-foreground italic mt-2">
            {t("formatExample")}
          </p>
        </CardContent>
      </Card>

      <ImportContactsForm
        pillars={pillars.map((p) => ({ id: p.id, name: p.name }))}
      />
    </div>
  );
}
