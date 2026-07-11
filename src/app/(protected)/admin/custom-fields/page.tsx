import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { asc } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { customFieldDefs } from "@/lib/db/schema";
import { requireSkill } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CustomFieldsTable } from "./table";
import { NewCustomFieldForm } from "./new-form";

export default async function CustomFieldsAdminPage() {
  await requireSkill("admin");
  const t = await getTranslations("admin.customFields");

  let rows: Array<{
    id: string;
    entityType: "contact" | "event" | "project" | "deal";
    key: string;
    label: string;
    type: "text" | "textarea" | "number" | "date" | "select";
    options: string[];
    required: boolean;
    sortOrder: number;
  }> = [];
  try {
    rows = await db
      .select({
        id: customFieldDefs.id,
        entityType: customFieldDefs.entityType,
        key: customFieldDefs.key,
        label: customFieldDefs.label,
        type: customFieldDefs.type,
        options: customFieldDefs.options,
        required: customFieldDefs.required,
        sortOrder: customFieldDefs.sortOrder,
      })
      .from(customFieldDefs)
      .orderBy(asc(customFieldDefs.entityType), asc(customFieldDefs.sortOrder));
  } catch (err) {
    console.error("[admin/custom-fields] list failed:", err);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
          <Link href="/admin/users">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("backToAdmin")}
          </Link>
        </Button>
        <h1 className="font-display text-4xl sm:text-5xl text-foreground leading-none">
          {t("title")}
        </h1>
        <p className="mt-2 text-base text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card>
        <CardContent className="py-6">
          <h2 className="text-sm font-medium text-foreground mb-3">
            {t("newSectionTitle")}
          </h2>
          <NewCustomFieldForm />
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">{t("empty")}</p>
      ) : (
        <CustomFieldsTable rows={rows} />
      )}
    </div>
  );
}
