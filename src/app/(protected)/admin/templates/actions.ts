"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { templates } from "@/lib/db/schema";
import { requireSkill } from "@/lib/dal";
import { logAudit } from "@/lib/audit";

const SCOPES = [
  "contact_note",
  "event_description",
  "project_description",
  "deal_description",
  "task_description",
  "doc_description",
  "generic",
] as const;

const schema = z.object({
  name: z.string().min(1).max(120),
  body: z.string().min(1),
  scope: z.enum(SCOPES),
  pillarId: z.string().uuid().nullable(),
});

export type TemplateFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function createTemplate(
  _prev: TemplateFormState | undefined,
  formData: FormData,
): Promise<TemplateFormState> {
  const profile = await requireSkill("admin");

  const raw = {
    name: String(formData.get("name") ?? "").trim(),
    body: String(formData.get("body") ?? "").trim(),
    scope: formData.get("scope") as string,
    pillarId: String(formData.get("pillarId") ?? "") || null,
  };

  if (!raw.name) return { fieldErrors: { name: "Nome obrigatório." } };
  if (!raw.body) return { fieldErrors: { body: "Corpo obrigatório." } };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: "Dados inválidos." };

  const [created] = await db
    .insert(templates)
    .values({
      name: parsed.data.name,
      body: parsed.data.body,
      scope: parsed.data.scope,
      pillarId: parsed.data.pillarId,
      createdBy: profile.id,
    })
    .returning();

  await logAudit({
    userId: profile.id,
    pillarId: created.pillarId,
    entityType: "template",
    entityId: created.id,
    action: "create",
    diff: { snapshot: created },
  });

  revalidatePath("/admin/templates");
  return {};
}

export async function updateTemplate(
  id: string,
  formData: FormData,
): Promise<TemplateFormState> {
  const profile = await requireSkill("admin");

  const raw = {
    name: String(formData.get("name") ?? "").trim(),
    body: String(formData.get("body") ?? "").trim(),
    scope: formData.get("scope") as string,
    pillarId: String(formData.get("pillarId") ?? "") || null,
  };
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: "Dados inválidos." };

  const before = await db.query.templates.findFirst({
    where: eq(templates.id, id),
  });
  if (!before) return { error: "Template não encontrado." };

  const [updated] = await db
    .update(templates)
    .set({
      name: parsed.data.name,
      body: parsed.data.body,
      scope: parsed.data.scope,
      pillarId: parsed.data.pillarId,
      updatedAt: new Date(),
    })
    .where(eq(templates.id, id))
    .returning();

  await logAudit({
    userId: profile.id,
    pillarId: updated.pillarId,
    entityType: "template",
    entityId: id,
    action: "update",
    diff: { before, after: updated },
  });

  revalidatePath("/admin/templates");
  return {};
}

export async function deleteTemplate(id: string): Promise<void> {
  const profile = await requireSkill("admin");
  const before = await db.query.templates.findFirst({
    where: eq(templates.id, id),
  });
  if (!before) return;
  await db.delete(templates).where(eq(templates.id, id));
  await logAudit({
    userId: profile.id,
    pillarId: before.pillarId,
    entityType: "template",
    entityId: id,
    action: "delete",
    diff: { snapshot: before },
  });
  revalidatePath("/admin/templates");
}
