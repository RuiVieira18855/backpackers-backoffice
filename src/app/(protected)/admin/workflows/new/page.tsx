import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { getAllProfiles, requireSkill } from "@/lib/dal";
import { WorkflowForm } from "../workflow-form";
import { createWorkflow } from "../actions";

export default async function NewWorkflowPage() {
  await requireSkill("admin");
  const t = await getTranslations("admin.workflows");
  const allProfiles = await getAllProfiles();
  const owners = allProfiles
    .filter((p) => p.role !== "member" || (p.skills ?? []).length > 0)
    .map((p) => ({ id: p.id, label: p.fullName ?? p.email }));

  return (
    <div className="max-w-3xl mx-auto px-6 md:px-10 py-10 space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
          <Link href="/admin/workflows">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("backToList")}
          </Link>
        </Button>
        <h1 className="font-display text-5xl text-foreground leading-none">
          {t("newWorkflow")}
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          {t("newHint")}
        </p>
      </div>

      <WorkflowForm
        mode="create"
        owners={owners}
        action={createWorkflow}
        onSaved="/admin/workflows"
      />
    </div>
  );
}
