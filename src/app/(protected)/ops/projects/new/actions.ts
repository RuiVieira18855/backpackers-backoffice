"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { requireRole } from "@/lib/dal";
import { logAudit } from "@/lib/audit";
import {
  getCustomFieldDefs,
  parseCustomFieldsFromFormData,
} from "@/lib/custom-fields";
import type { ProjectFormState } from "@/components/projects/project-form";

const STATUSES = ["planned", "active", "on_hold", "completed", "cancelled"] as const;

const schema = z.object({
  name: z.string().min(1),
  pillarId: z.string().uuid(),
  status: z.enum(STATUSES),
  description: z.string().optional(),
  clientContactId: z.string().uuid().nullable(),
  startDate: z.string().nullable(),
  targetDate: z.string().nullable(),
  notes: z.string().optional(),
});

export async function createProject(
  _prev: ProjectFormState | undefined,
  formData: FormData,
): Promise<ProjectFormState> {
  const profile = await requireRole("admin_grupo", "admin_pilar");
  const tErrors = await getTranslations("ops.projects.form.errors");

  const raw = {
    name: String(formData.get("name") ?? "").trim(),
    pillarId: String(formData.get("pillarId") ?? ""),
    status: formData.get("status") as string,
    description: String(formData.get("description") ?? "").trim(),
    clientContactId:
      String(formData.get("clientContactId") ?? "") || null,
    startDate: String(formData.get("startDate") ?? "") || null,
    targetDate: String(formData.get("targetDate") ?? "") || null,
    notes: String(formData.get("notes") ?? "").trim(),
  };

  if (!raw.name) {
    return { fieldErrors: { name: tErrors("nameRequired") } };
  }
  if (!raw.pillarId) {
    return { fieldErrors: { pillarId: tErrors("pillarRequired") } };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const first = Object.entries(flat.fieldErrors)[0];
    return {
      error: first ? `${first[0]}: ${first[1]?.[0] ?? ""}` : "Invalid data",
    };
  }

  const customDefs = await getCustomFieldDefs("project");
  const customFields = parseCustomFieldsFromFormData(formData, customDefs);

  const [created] = await db
    .insert(projects)
    .values({
      name: parsed.data.name,
      pillarId: parsed.data.pillarId,
      status: parsed.data.status,
      description: parsed.data.description || null,
      clientContactId: parsed.data.clientContactId,
      startDate: parsed.data.startDate,
      targetDate: parsed.data.targetDate,
      notes: parsed.data.notes || null,
      customFields,
      ownerId: profile.id,
    })
    .returning();

  await logAudit({
    userId: profile.id,
    pillarId: created.pillarId,
    entityType: "project",
    entityId: created.id,
    action: "create",
    diff: { snapshot: created },
  });

  redirect(`/ops/projects/${created.id}`);
}
