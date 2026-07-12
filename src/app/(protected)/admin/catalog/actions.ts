"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { catalogActivities } from "@/lib/db/schema";
import { requireRole } from "@/lib/dal";
import { logAudit } from "@/lib/audit";

export type CatalogState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const FAMILIES = ["wild", "hive", "multi"] as const;

const numOrNull = z
  .string()
  .optional()
  .transform((v) => {
    if (!v || v.trim() === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(n) : null;
  });

const schema = z.object({
  code: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "Só letras minúsculas, números e hífen."),
  name: z.string().min(1),
  tagline: z.string().optional(),
  family: z.enum(FAMILIES),
  pillarId: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v : null)),
  durationLabel: z.string().optional(),
  paxMin: numOrNull,
  paxMax: numOrNull,
  priceTargetMin: numOrNull,
  priceTargetMax: numOrNull,
  pricePerPaxMin: numOrNull,
  pricePerPaxMax: numOrNull,
  targetAudience: z.string().optional(),
  body: z.string().optional(),
  sortOrder: numOrNull,
});

function readForm(formData: FormData) {
  return {
    code: String(formData.get("code") ?? "").trim().toLowerCase(),
    name: String(formData.get("name") ?? "").trim(),
    tagline: String(formData.get("tagline") ?? "").trim() || undefined,
    family: formData.get("family") as string,
    pillarId: String(formData.get("pillarId") ?? "").trim() || undefined,
    durationLabel:
      String(formData.get("durationLabel") ?? "").trim() || undefined,
    paxMin: String(formData.get("paxMin") ?? ""),
    paxMax: String(formData.get("paxMax") ?? ""),
    priceTargetMin: String(formData.get("priceTargetMin") ?? ""),
    priceTargetMax: String(formData.get("priceTargetMax") ?? ""),
    pricePerPaxMin: String(formData.get("pricePerPaxMin") ?? ""),
    pricePerPaxMax: String(formData.get("pricePerPaxMax") ?? ""),
    targetAudience:
      String(formData.get("targetAudience") ?? "").trim() || undefined,
    body: String(formData.get("body") ?? ""),
    sortOrder: String(formData.get("sortOrder") ?? "0"),
  };
}

export async function createCatalogActivity(
  _prev: CatalogState | undefined,
  formData: FormData,
): Promise<CatalogState> {
  const profile = await requireRole("admin_grupo");
  const raw = readForm(formData);
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
      .insert(catalogActivities)
      .values({
        code: parsed.data.code,
        name: parsed.data.name,
        tagline: parsed.data.tagline ?? null,
        family: parsed.data.family,
        pillarId: parsed.data.pillarId,
        durationLabel: parsed.data.durationLabel ?? null,
        paxMin: parsed.data.paxMin,
        paxMax: parsed.data.paxMax,
        priceTargetMin: parsed.data.priceTargetMin,
        priceTargetMax: parsed.data.priceTargetMax,
        pricePerPaxMin: parsed.data.pricePerPaxMin,
        pricePerPaxMax: parsed.data.pricePerPaxMax,
        targetAudience: parsed.data.targetAudience ?? null,
        body: parsed.data.body ?? "",
        sortOrder: parsed.data.sortOrder ?? 0,
        createdBy: profile.id,
        updatedBy: profile.id,
      })
      .returning();

    await logAudit({
      userId: profile.id,
      pillarId: created.pillarId,
      entityType: "catalog_activity",
      entityId: created.id,
      action: "create",
      diff: { snapshot: created },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/duplicate key|unique/i.test(msg)) {
      return {
        fieldErrors: { code: "Já existe uma actividade com este código." },
      };
    }
    return { error: msg };
  }

  revalidatePath("/admin/catalog");
  revalidatePath("/library");
  redirect("/admin/catalog");
}

export async function updateCatalogActivity(
  id: string,
  _prev: CatalogState | undefined,
  formData: FormData,
): Promise<CatalogState> {
  const profile = await requireRole("admin_grupo");

  const before = await db.query.catalogActivities.findFirst({
    where: eq(catalogActivities.id, id),
  });
  if (!before) return { error: "Não encontrado." };

  const raw = readForm(formData);
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
      .update(catalogActivities)
      .set({
        code: parsed.data.code,
        name: parsed.data.name,
        tagline: parsed.data.tagline ?? null,
        family: parsed.data.family,
        pillarId: parsed.data.pillarId,
        durationLabel: parsed.data.durationLabel ?? null,
        paxMin: parsed.data.paxMin,
        paxMax: parsed.data.paxMax,
        priceTargetMin: parsed.data.priceTargetMin,
        priceTargetMax: parsed.data.priceTargetMax,
        pricePerPaxMin: parsed.data.pricePerPaxMin,
        pricePerPaxMax: parsed.data.pricePerPaxMax,
        targetAudience: parsed.data.targetAudience ?? null,
        body: parsed.data.body ?? "",
        sortOrder: parsed.data.sortOrder ?? 0,
        updatedBy: profile.id,
        updatedAt: new Date(),
      })
      .where(eq(catalogActivities.id, id))
      .returning();

    await logAudit({
      userId: profile.id,
      pillarId: updated.pillarId,
      entityType: "catalog_activity",
      entityId: id,
      action: "update",
      diff: { before, after: updated },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/duplicate key|unique/i.test(msg)) {
      return {
        fieldErrors: { code: "Já existe uma actividade com este código." },
      };
    }
    return { error: msg };
  }

  revalidatePath("/admin/catalog");
  revalidatePath("/library");
  revalidatePath(`/library/${parsed.data.code}`);
  redirect("/admin/catalog");
}

export async function deleteCatalogActivity(id: string): Promise<void> {
  const profile = await requireRole("admin_grupo");
  const before = await db.query.catalogActivities.findFirst({
    where: eq(catalogActivities.id, id),
  });
  if (!before) return;
  await db.delete(catalogActivities).where(eq(catalogActivities.id, id));
  await logAudit({
    userId: profile.id,
    pillarId: before.pillarId,
    entityType: "catalog_activity",
    entityId: id,
    action: "delete",
    diff: { snapshot: before },
  });
  revalidatePath("/admin/catalog");
  revalidatePath("/library");
}

export async function toggleCatalogActivityActive(
  id: string,
  active: boolean,
): Promise<void> {
  const profile = await requireRole("admin_grupo");
  const before = await db.query.catalogActivities.findFirst({
    where: eq(catalogActivities.id, id),
  });
  if (!before) return;
  const [updated] = await db
    .update(catalogActivities)
    .set({ isActive: active, updatedBy: profile.id, updatedAt: new Date() })
    .where(eq(catalogActivities.id, id))
    .returning();
  await logAudit({
    userId: profile.id,
    pillarId: updated.pillarId,
    entityType: "catalog_activity",
    entityId: id,
    action: "update",
    diff: { before: { isActive: before.isActive }, after: { isActive: active } },
  });
  revalidatePath("/admin/catalog");
  revalidatePath("/library");
}
