"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/dal";
import { logAudit } from "@/lib/audit";
import { collectionByKey, type CollectionDef } from "@/lib/babyland/collections";
import { getDocById, removeDoc, saveDoc } from "@/lib/babyland/firestore";

export type BabylandState = { error?: string; fieldErrors?: Record<string, string> };

function coerce(def: CollectionDef, formData: FormData) {
  const out: Record<string, unknown> = {};
  const errors: Record<string, string> = {};
  for (const f of def.fields) {
    const raw = formData.get(f.name);
    if (f.type === "boolean") {
      out[f.name] = raw === "on" || raw === "true";
      continue;
    }
    const value = String(raw ?? "").trim();
    if (!value) {
      if (f.required) errors[f.name] = `${f.label} é obrigatório.`;
      else out[f.name] = f.type === "number" ? null : "";
      continue;
    }
    if (f.type === "number") {
      const n = Number(value.replace(",", "."));
      if (Number.isNaN(n)) errors[f.name] = `${f.label} tem de ser um número.`;
      else out[f.name] = n;
      continue;
    }
    if (f.type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      errors[f.name] = `${f.label} tem de estar no formato AAAA-MM-DD.`;
      continue;
    }
    if (f.type === "url" && !/^https?:\/\//i.test(value)) {
      errors[f.name] = `${f.label} tem de começar por http:// ou https://`;
      continue;
    }
    out[f.name] = value;
  }
  return { data: out, errors };
}

export async function saveBabylandDoc(
  colKey: string,
  id: string | null,
  _prev: BabylandState | undefined,
  formData: FormData,
): Promise<BabylandState> {
  const profile = await requireRole("admin_grupo");
  const def = collectionByKey(colKey);
  if (!def) return { error: "Coleção desconhecida." };

  const { data, errors } = coerce(def, formData);
  if (Object.keys(errors).length) return { fieldErrors: errors };

  let savedId: string;
  try {
    const before = id ? await getDocById(def.collection, id) : null;
    savedId = await saveDoc(def.collection, id, data);
    await logAudit({
      userId: profile.id,
      entityType: `babyland_${def.collection}`,
      entityId: savedId,
      action: id ? "update" : "create",
      diff: id ? { before, after: data } : { snapshot: data },
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }

  revalidatePath(`/admin/babyland/${colKey}`);
  redirect(`/admin/babyland/${colKey}`);
}

export async function deleteBabylandDoc(
  colKey: string,
  id: string,
): Promise<void> {
  const profile = await requireRole("admin_grupo");
  const def = collectionByKey(colKey);
  if (!def) return;
  const before = await getDocById(def.collection, id);
  await removeDoc(def.collection, id);
  await logAudit({
    userId: profile.id,
    entityType: `babyland_${def.collection}`,
    entityId: id,
    action: "delete",
    diff: { snapshot: before },
  });
  revalidatePath(`/admin/babyland/${colKey}`);
}
