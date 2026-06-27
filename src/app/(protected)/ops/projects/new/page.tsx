import { getTranslations } from "next-intl/server";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { getAllPillars, requireRole } from "@/lib/dal";
import { ProjectForm } from "@/components/projects/project-form";
import { getTemplatesForScope } from "@/lib/templates";
import { getCustomFieldDefs } from "@/lib/custom-fields";
import { createProject } from "./actions";

type SearchParams = Promise<{ client?: string }>;

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireRole("admin_grupo", "admin_pilar");
  const t = await getTranslations("ops.projects.form");
  const sp = await searchParams;
  const defaultClientContactId = sp.client || undefined;

  const [pillars, allContacts, descriptionTemplates, customFieldDefs] =
    await Promise.all([
      getAllPillars(),
      db.query.contacts.findMany({
        orderBy: [asc(contacts.fullName)],
        limit: 500,
      }),
      getTemplatesForScope("project_description"),
      getCustomFieldDefs("project"),
    ]);

  return (
    <div className="max-w-4xl mx-auto px-6 md:px-10 py-10 space-y-8">
      <div>
        <h1 className="font-display text-5xl text-foreground leading-none">
          {t("title")}
        </h1>
        <p className="mt-2 text-base text-muted-foreground">{t("subtitle")}</p>
      </div>
      <ProjectForm
        pillars={pillars.map((p) => ({ id: p.id, name: p.name }))}
        contacts={allContacts.map((c) => ({
          id: c.id,
          fullName: c.fullName,
          company: c.company,
        }))}
        defaultClientContactId={defaultClientContactId}
        descriptionTemplates={descriptionTemplates}
        customFieldDefs={customFieldDefs}
        action={createProject}
      />
    </div>
  );
}
