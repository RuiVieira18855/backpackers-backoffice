"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { customFieldDefs } from "@/lib/db/schema";
import { requireSkill } from "@/lib/dal";
import { logAudit } from "@/lib/audit";

const ENTITIES = ["contact", "event", "project", "deal"] as const;
const TYPES = ["text", "textarea", "number", "date", "select"] as const;

const schema = z.object({
  entityType: z.enum(ENTITIES),
  key: z.string().regex(/^[a-z][a-z0-9_]*$/, "Lowercase + underscores."),
  label: z.string().min(1),
  type: z.enum(TYPES),
  options: z.string().optional(),
  required: z.string().optional(), // "on" or absent
  sortOrder: z.string().regex(/^-?\d+$/).optional(),
});

export type CustomFieldFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function parseOptions(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function createCustomFieldDef(
  _prev: CustomFieldFormState | undefined,
  formData: FormData,
): Promise<CustomFieldFormState> {
  const profile = await requireSkill("admin");

  const raw = {
    entityType: formData.get("entityType") as string,
    key: String(formData.get("key") ?? "").trim().toLowerCase(),
    label: String(formData.get("label") ?? "").trim(),
    type: formData.get("type") as string,
    options: String(formData.get("options") ?? "").trim(),
    required: formData.get("required") ? "on" : undefined,
    sortOrder: String(formData.get("sortOrder") ?? "0"),
  };

  if (!raw.key)
    return { fieldErrors: { key: "Chave obrigatória (ex: telefone_fax)." } };
  if (!raw.label)
    return { fieldErrors: { label: "Etiqueta obrigatória." } };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const flat = z.flattenError(parsed.error);
    const first = Object.entries(flat.fieldErrors)[0];
    return {
      error: first ? `${first[0]}: ${first[1]?.[0] ?? ""}` : "Dados inválidos.",
    };
  }

  try {
    const [created] = await db
      .insert(customFieldDefs)
      .values({
        entityType: parsed.data.entityType,
        key: parsed.data.key,
        label: parsed.data.label,
        type: parsed.data.type,
        options: parsed.data.type === "select"
          ? parseOptions(parsed.data.options ?? "")
          : [],
        required: parsed.data.required === "on",
        sortOrder: Number(parsed.data.sortOrder ?? "0"),
        createdBy: profile.id,
      })
      .returning();

    await logAudit({
      userId: profile.id,
      pillarId: null,
      entityType: "custom_field_def",
      entityId: created.id,
      action: "create",
      diff: { snapshot: created },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/duplicate key|unique/i.test(msg)) {
      return {
        fieldErrors: {
          key: "Já existe um campo com essa chave para esta entidade.",
        },
      };
    }
    return { error: msg };
  }

  revalidatePath("/admin/custom-fields");
  return {};
}

export async function updateCustomFieldDef(
  id: string,
  _prev: CustomFieldFormState | undefined,
  formData: FormData,
): Promise<CustomFieldFormState> {
  const profile = await requireSkill("admin");

  const before = await db.query.customFieldDefs.findFirst({
    where: eq(customFieldDefs.id, id),
  });
  if (!before) return { error: "Not found" };

  const raw = {
    entityType: before.entityType,
    key: before.key,
    label: String(formData.get("label") ?? "").trim(),
    type: before.type,
    options: String(formData.get("options") ?? "").trim(),
    required: formData.get("required") ? "on" : undefined,
    sortOrder: String(formData.get("sortOrder") ?? String(before.sortOrder)),
  };

  if (!raw.label)
    return { fieldErrors: { label: "Etiqueta obrigatória." } };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const flat = z.flattenError(parsed.error);
    const first = Object.entries(flat.fieldErrors)[0];
    return {
      error: first ? `${first[0]}: ${first[1]?.[0] ?? ""}` : "Dados inválidos.",
    };
  }

  try {
    const [updated] = await db
      .update(customFieldDefs)
      .set({
        label: parsed.data.label,
        options:
          before.type === "select"
            ? parseOptions(parsed.data.options ?? "")
            : [],
        required: parsed.data.required === "on",
        sortOrder: Number(parsed.data.sortOrder ?? "0"),
        updatedAt: new Date(),
      })
      .where(eq(customFieldDefs.id, id))
      .returning();

    await logAudit({
      userId: profile.id,
      pillarId: null,
      entityType: "custom_field_def",
      entityId: id,
      action: "update",
      diff: { before, after: updated },
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }

  revalidatePath("/admin/custom-fields");
  return {};
}

export async function deleteCustomFieldDef(id: string): Promise<void> {
  const profile = await requireSkill("admin");
  const before = await db.query.customFieldDefs.findFirst({
    where: eq(customFieldDefs.id, id),
  });
  if (!before) return;
  await db.delete(customFieldDefs).where(eq(customFieldDefs.id, id));
  await logAudit({
    userId: profile.id,
    pillarId: null,
    entityType: "custom_field_def",
    entityId: id,
    action: "delete",
    diff: { snapshot: before },
  });
  revalidatePath("/admin/custom-fields");
}
