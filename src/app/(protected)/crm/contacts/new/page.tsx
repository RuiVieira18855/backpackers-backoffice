import { getTranslations } from "next-intl/server";
import { getAllPillars, requireRole } from "@/lib/dal";
import { ContactForm } from "@/components/contacts/contact-form";
import { createContact } from "./actions";

export default async function NewContactPage() {
  await requireRole("admin_grupo", "admin_pilar");
  const t = await getTranslations("crm.form");
  const pillars = await getAllPillars();

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
        action={createContact}
      />
    </div>
  );
}
