"use server";

import { revalidatePath } from "next/cache";
import { inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { requireRole } from "@/lib/dal";
import { logAudit } from "@/lib/audit";

export type BulkResult = { ok: true } | { ok: false; error: string };

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
  return { ok: true };
}
