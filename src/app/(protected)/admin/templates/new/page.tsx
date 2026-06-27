import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { getAllPillars, requireSkill } from "@/lib/dal";
import { TemplateForm } from "../template-form";

export default async function NewTemplatePage() {
  await requireSkill("admin");
  const t = await getTranslations("admin.templates");
  const pillars = await getAllPillars();

  return (
    <div className="max-w-2xl mx-auto px-6 md:px-10 py-10 space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
          <Link href="/admin/templates">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("backToList")}
          </Link>
        </Button>
        <h1 className="font-display text-5xl text-foreground leading-none">
          {t("newTemplate")}
        </h1>
      </div>
      <TemplateForm pillars={pillars.map((p) => ({ id: p.id, name: p.name }))} />
    </div>
  );
}
