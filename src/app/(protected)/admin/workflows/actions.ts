"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";
import { requireSkill } from "@/lib/dal";
import { logAudit } from "@/lib/audit";
import { TRIGGERS, CONDITION_OPS } from "@/lib/workflows";

export type WorkflowFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const conditionSchema = z.object({
  field: z.string().min(1),
  op: z.enum(CONDITION_OPS),
  value: z.string(),
});

const actionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("create_task"),
    title: z.string().min(1),
    assigneeId: z.uuid().optional(),
    dueOffsetDays: z.number().int().min(0).max(365).optional(),
    description: z.string().optional(),
    pillarId: z.uuid().optional(),
  }),
  z.object({
    type: z.literal("send_notification"),
    targetUserId: z.uuid(),
    title: z.string().min(1),
    body: z.string().optional(),
    link: z.string().optional(),
  }),
  z.object({
    type: z.literal("append_note"),
    text: z.string().min(1),
  }),
]);

const upsertSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  triggerType: z.enum(TRIGGERS),
  conditions: z.array(conditionSchema).default([]),
  actions: z.array(actionSchema).min(1),
  isActive: z.boolean().default(true),
});

function parsePayload(formData: FormData): {
  raw: {
    name: string;
    description: string;
    triggerType: string;
    isActive: boolean;
  };
  conditions: unknown;
  actions: unknown;
} {
  return {
    raw: {
      name: String(formData.get("name") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      triggerType: String(formData.get("triggerType") ?? ""),
      isActive: formData.get("isActive") === "on",
    },
    conditions: safeJson(formData.get("conditions") as string | null),
    actions: safeJson(formData.get("actions") as string | null),
  };
}

function safeJson(raw: string | null): unknown {
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function createWorkflow(
  _prev: WorkflowFormState | undefined,
  formData: FormData,
): Promise<WorkflowFormState> {
  const profile = await requireSkill("admin");
  const { raw, conditions, actions } = parsePayload(formData);
  if (!raw.name) return { fieldErrors: { name: "Nome obrigatório." } };
  if (!raw.triggerType)
    return { fieldErrors: { triggerType: "Escolhe um trigger." } };

  const parsed = upsertSchema.safeParse({
    name: raw.name,
    description: raw.description || undefined,
    triggerType: raw.triggerType,
    conditions,
    actions,
    isActive: raw.isActive,
  });
  if (!parsed.success) {
    const flat = z.flattenError(parsed.error);
    const first = Object.entries(flat.fieldErrors)[0];
    return {
      error: first ? `${first[0]}: ${first[1]?.[0] ?? ""}` : "Dados inválidos.",
    };
  }

  const [created] = await db
    .insert(workflows)
    .values({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      triggerType: parsed.data.triggerType,
      conditions: parsed.data.conditions,
      actions: parsed.data.actions,
      isActive: parsed.data.isActive,
      createdBy: profile.id,
    })
    .returning();

  try {
    await logAudit({
      userId: profile.id,
      entityType: "workflow",
      entityId: created.id,
      action: "create",
      diff: { snapshot: created },
    });
  } catch {
    /* audit best-effort */
  }

  revalidatePath("/admin/workflows");
  return {};
}

export async function updateWorkflow(
  id: string,
  _prev: WorkflowFormState | undefined,
  formData: FormData,
): Promise<WorkflowFormState> {
  const profile = await requireSkill("admin");
  const { raw, conditions, actions } = parsePayload(formData);
  if (!raw.name) return { fieldErrors: { name: "Nome obrigatório." } };

  const parsed = upsertSchema.safeParse({
    name: raw.name,
    description: raw.description || undefined,
    triggerType: raw.triggerType,
    conditions,
    actions,
    isActive: raw.isActive,
  });
  if (!parsed.success) {
    const flat = z.flattenError(parsed.error);
    const first = Object.entries(flat.fieldErrors)[0];
    return {
      error: first ? `${first[0]}: ${first[1]?.[0] ?? ""}` : "Dados inválidos.",
    };
  }

  const before = await db.query.workflows.findFirst({
    where: eq(workflows.id, id),
  });
  if (!before) return { error: "Workflow não encontrado." };

  const [after] = await db
    .update(workflows)
    .set({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      triggerType: parsed.data.triggerType,
      conditions: parsed.data.conditions,
      actions: parsed.data.actions,
      isActive: parsed.data.isActive,
      updatedAt: new Date(),
    })
    .where(eq(workflows.id, id))
    .returning();

  try {
    await logAudit({
      userId: profile.id,
      entityType: "workflow",
      entityId: id,
      action: "update",
      diff: { before, after },
    });
  } catch {
    /* audit best-effort */
  }

  revalidatePath("/admin/workflows");
  revalidatePath(`/admin/workflows/${id}`);
  return {};
}

export async function toggleWorkflowActive(
  id: string,
  isActive: boolean,
): Promise<void> {
  const profile = await requireSkill("admin");
  await db
    .update(workflows)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(workflows.id, id));
  try {
    await logAudit({
      userId: profile.id,
      entityType: "workflow",
      entityId: id,
      action: "update",
      diff: { isActive },
    });
  } catch {
    /* audit best-effort */
  }
  revalidatePath("/admin/workflows");
  revalidatePath(`/admin/workflows/${id}`);
}

export async function deleteWorkflow(id: string): Promise<void> {
  const profile = await requireSkill("admin");
  const before = await db.query.workflows.findFirst({
    where: eq(workflows.id, id),
  });
  if (!before) return;
  await db.delete(workflows).where(eq(workflows.id, id));
  try {
    await logAudit({
      userId: profile.id,
      entityType: "workflow",
      entityId: id,
      action: "delete",
      diff: { snapshot: before },
    });
  } catch {
    /* audit best-effort */
  }
  revalidatePath("/admin/workflows");
}
