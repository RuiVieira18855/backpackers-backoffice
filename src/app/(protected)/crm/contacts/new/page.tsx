import { getTranslations } from "next-intl/server";
import { getAllPillars, requireRole } from "@/lib/dal";
import { ContactForm } from "@/components/contacts/contact-form";
import { getTemplatesForScope } from "@/lib/templates";
import { getCustomFieldDefs } from "@/lib/custom-fields";
import { createContact } from "./actions";

const VALID_TYPES = ["lead", "customer", "partner", "vendor"] as const;

type SearchParams = Promise<{ type?: string }>;

export default async function NewContactPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireRole("admin_grupo", "admin_pilar");
  const t = await getTranslations("crm.form");
  const sp = await searchParams;
  const [pillars, noteTemplates, customFieldDefs] = await Promise.all([
    getAllPillars(),
    getTemplatesForScope("contact_note"),
    getCustomFieldDefs("contact"),
  ]);

  const defaultType =
    sp.type && (VALID_TYPES as readonly string[]).includes(sp.type)
      ? (sp.type as (typeof VALID_TYPES)[number])
      : undefined;

  return (
    <div className="max-w-4xl mx-auto px-6 md:px-10 py-10 space-y-8">
      <div>
        <h1 className="font-display text-5xl text-foreground leading-none">
          {t("title")}
        </h1>
        <p className="mt-2 text-base text-muted-foreground">{t("subtitle")}</p>
      </div>
      <ContactForm
        pillars={pillars.map((p) => ({ id: p.id, name: p.name }))}
        defaultType={defaultType}
        noteTemplates={noteTemplates}
        customFieldDefs={customFieldDefs}
        action={createContact}
      />
    </div>
  );
}
