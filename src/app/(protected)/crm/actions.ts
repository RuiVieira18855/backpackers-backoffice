"use server";

import { revalidatePath } from "next/cache";
import { inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts, profiles } from "@/lib/db/schema";
import { requireRole } from "@/lib/dal";
import { logAudit } from "@/lib/audit";

export type BulkResult = { ok: true; count?: number } | { ok: false; error: string };

const STAGES = ["new", "qualified", "active", "on_hold", "closed_won", "closed_lost"] as const;
type Stage = (typeof STAGES)[number];

/**
 * Bulk delete contacts. Restricted to admin_grupo+ (super_user passes implicit
 * via requireRole). Audit log entry per id so the trail isn't lossy.
 */
export async function bulkDeleteContacts(ids: string[]): Promise<BulkResult> {
  if (!Array.isArray(ids) || ids.length === 0) {
    return { ok: false, error: "Nothing to delete." };
  }
  if (ids.length > 500) {
    return { ok: false, error: "Demasiados registos para apagar de uma vez." };
  }

  const profile = await requireRole("admin_grupo");

  // Snapshot the rows we're about to delete so we can audit them.
  const before = await db
    .select()
    .from(contacts)
    .where(inArray(contacts.id, ids));

  if (before.length === 0) {
    return { ok: true };
  }

  await db.delete(contacts).where(inArray(contacts.id, ids));

  // Best-effort audit — one entry per deleted contact.
  for (const row of before) {
    try {
      await logAudit({
        userId: profile.id,
        pillarId: row.pillarId,
        entityType: "contact",
        entityId: row.id,
        action: "delete",
        diff: { snapshot: row, bulk: true },
      });
    } catch (err) {
      console.error("[crm] audit on bulk delete failed:", err);
    }
  }

  revalidatePath("/crm");
  return { ok: true, count: before.length };
}

/**
 * Bulk change stage. Skipped rows are logged once — RLS may reject if the
 * caller lacks pillar access.
 */
export async function bulkUpdateContactStage(
  ids: string[],
  stage: string,
): Promise<BulkResult> {
  if (!Array.isArray(ids) || ids.length === 0)
    return { ok: false, error: "Nothing to update." };
  if (!(STAGES as readonly string[]).includes(stage))
    return { ok: false, error: "Invalid stage." };
  if (ids.length > 500)
    return { ok: false, error: "Demasiados registos (máx 500)." };

  const profile = await requireRole("admin_grupo", "admin_pilar");
  const before = await db
    .select({ id: contacts.id, stage: contacts.stage, pillarId: contacts.pillarId })
    .from(contacts)
    .where(inArray(contacts.id, ids));
  if (before.length === 0) return { ok: true, count: 0 };

  await db
    .update(contacts)
    .set({ stage: stage as Stage, updatedAt: new Date() })
    .where(inArray(contacts.id, ids));

  for (const row of before) {
    if (row.stage === stage) continue;
    try {
      await logAudit({
        userId: profile.id,
        pillarId: row.pillarId,
        entityType: "contact",
        entityId: row.id,
        action: "update",
        diff: { stageChange: { from: row.stage, to: stage }, bulk: true },
      });
    } catch {
      /* best-effort */
    }
  }

  revalidatePath("/crm");
  return { ok: true, count: before.length };
}

/**
 * Bulk assign owner. Empty string ownerId means "unassign" (set to null).
 */
export async function bulkAssignOwner(
  ids: string[],
  ownerId: string,
): Promise<BulkResult> {
  if (!Array.isArray(ids) || ids.length === 0)
    return { ok: false, error: "Nothing to update." };
  if (ids.length > 500)
    return { ok: false, error: "Demasiados registos (máx 500)." };

  const profile = await requireRole("admin_grupo", "admin_pilar");

  // Validate owner exists (unless clearing).
  let normalisedOwner: string | null = null;
  if (ownerId) {
    const [row] = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(sql`${profiles.id} = ${ownerId}::uuid`)
      .limit(1);
    if (!row) return { ok: false, error: "Owner inválido." };
    normalisedOwner = row.id;
  }

  const before = await db
    .select({ id: contacts.id, ownerId: contacts.ownerId, pillarId: contacts.pillarId })
    .from(contacts)
    .where(inArray(contacts.id, ids));
  if (before.length === 0) return { ok: true, count: 0 };

  await db
    .update(contacts)
    .set({ ownerId: normalisedOwner, updatedAt: new Date() })
    .where(inArray(contacts.id, ids));

  for (const row of before) {
    if (row.ownerId === normalisedOwner) continue;
    try {
      await logAudit({
        userId: profile.id,
        pillarId: row.pillarId,
        entityType: "contact",
        entityId: row.id,
        action: "update",
        diff: {
          ownerChange: { from: row.ownerId, to: normalisedOwner },
          bulk: true,
        },
      });
    } catch {
      /* best-effort */
    }
  }

  revalidatePath("/crm");
  return { ok: true, count: before.length };
}

/**
 * Bulk add tag(s). Comma-separated string is split. Existing tags on each
 * contact are preserved; only new ones are appended, deduped.
 */
export async function bulkAddTag(
  ids: string[],
  rawTag: string,
): Promise<BulkResult> {
  if (!Array.isArray(ids) || ids.length === 0)
    return { ok: false, error: "Nothing to update." };
  if (ids.length > 500)
    return { ok: false, error: "Demasiados registos (máx 500)." };

  const tags = rawTag
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  if (tags.length === 0) return { ok: false, error: "Tag vazia." };

  const profile = await requireRole("admin_grupo", "admin_pilar");

  const before = await db
    .select({ id: contacts.id, tags: contacts.tags, pillarId: contacts.pillarId })
    .from(contacts)
    .where(inArray(contacts.id, ids));
  if (before.length === 0) return { ok: true, count: 0 };

  for (const row of before) {
    const merged = Array.from(new Set([...(row.tags ?? []), ...tags]));
    if (merged.length === (row.tags?.length ?? 0)) continue;
    await db
      .update(contacts)
      .set({ tags: merged, updatedAt: new Date() })
      .where(sql`${contacts.id} = ${row.id}::uuid`);
    try {
      await logAudit({
        userId: profile.id,
        pillarId: row.pillarId,
        entityType: "contact",
        entityId: row.id,
        action: "update",
        diff: { tagsAdded: tags, bulk: true },
      });
    } catch {
      /* best-effort */
    }
  }

  revalidatePath("/crm");
  return { ok: true, count: before.length };
}
