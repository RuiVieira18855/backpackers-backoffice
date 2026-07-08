import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";
import { getAllProfiles, requireSkill } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import { WorkflowForm } from "../workflow-form";
import { updateWorkflow } from "../actions";
import { WorkflowSideActions } from "./side-actions";

type Props = { params: Promise<{ id: string }> };

export default async function EditWorkflowPage({ params }: Props) {
  await requireSkill("admin");
  const { id } = await params;
  const t = await getTranslations("admin.workflows");

  const wf = await db.query.workflows.findFirst({
    where: eq(workflows.id, id),
  });
  if (!wf) notFound();

  const allProfiles = await getAllProfiles();
  const owners = allProfiles
    .filter((p) => p.role !== "member" || (p.skills ?? []).length > 0)
    .map((p) => ({ id: p.id, label: p.fullName ?? p.email }));

  const boundUpdate = updateWorkflow.bind(null, id);

  return (
    <div className="max-w-3xl mx-auto px-6 md:px-10 py-10 space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
          <Link href="/admin/workflows">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("backToList")}
          </Link>
        </Button>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-5xl text-foreground leading-none">
              {wf.name}
            </h1>
            <p className="mt-2 text-base text-muted-foreground">
              {t(`triggers.${wf.triggerType}` as never)}
            </p>
          </div>
          <WorkflowSideActions
            workflowId={id}
            isActive={wf.isActive}
            name={wf.name}
          />
        </div>
      </div>

      <WorkflowForm
        mode="edit"
        owners={owners}
        defaults={{
          name: wf.name,
          description: wf.description,
          triggerType: wf.triggerType,
          conditions: (wf.conditions ?? []) as never,
          actions: (wf.actions ?? []) as never,
          isActive: wf.isActive,
        }}
        action={boundUpdate}
        onSaved="/admin/workflows"
      />
    </div>
  );
}
