"use server";

import { revalidatePath } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts, events, projects } from "@/lib/db/schema";
import { requireRole } from "@/lib/dal";
import { logAudit } from "@/lib/audit";

export type MergeResult = { ok: true } | { ok: false; error: string };

/**
 * Merge a group of duplicate contacts into a single "keeper".
 *
 * - keeperId stays; for each loser id we:
 *   1. Re-parent referenced events.client_contact_id -> keeperId
 *   2. Re-parent referenced projects.client_contact_id -> keeperId
 *   3. Backfill empty keeper fields from the loser (phone, email, company…)
 *   4. Append loser notes to keeper notes
 *   5. Delete the loser
 * - One audit_log entry per loser plus one for the keeper update.
 *
 * Restricted to admin_grupo+ (super_user passes implicitly).
 */
export async function mergeContacts(
  keeperId: string,
  loserIds: string[],
): Promise<MergeResult> {
  if (!keeperId) return { ok: false, error: "keeperId obrigatório." };
  if (!Array.isArray(loserIds) || loserIds.length === 0) {
    return { ok: false, error: "Sem contactos para fundir." };
  }
  if (loserIds.includes(keeperId)) {
    return { ok: false, error: "O keeper não pode estar na lista de losers." };
  }
  if (loserIds.length > 20) {
    return {
      ok: false,
      error: "Demasiados contactos para fundir de uma vez (máx 20).",
    };
  }

  const profile = await requireRole("admin_grupo");

  const allIds = [keeperId, ...loserIds];
  const rows = await db
    .select()
    .from(contacts)
    .where(inArray(contacts.id, allIds));

  const keeper = rows.find((r) => r.id === keeperId);
  if (!keeper) return { ok: false, error: "Keeper não encontrado." };

  const losers = rows.filter((r) => loserIds.includes(r.id));
  if (losers.length === 0) {
    return { ok: false, error: "Losers não encontrados." };
  }

  // Re-parent events + projects in a single statement per table.
  await db
    .update(events)
    .set({ clientContactId: keeperId })
    .where(inArray(events.clientContactId, loserIds));
  await db
    .update(projects)
    .set({ clientContactId: keeperId })
    .where(inArray(projects.clientContactId, loserIds));

  // Backfill keeper fields from losers (prefer keeper, fall back to first loser
  // that has a value).
  const pick = <T>(curr: T | null, fallbacks: (T | null)[]): T | null => {
    if (curr) return curr;
    for (const f of fallbacks) if (f) return f;
    return null;
  };

  const next = {
    email: pick(
      keeper.email,
      losers.map((l) => l.email),
    ),
    phone: pick(
      keeper.phone,
      losers.map((l) => l.phone),
    ),
    company: pick(
      keeper.company,
      losers.map((l) => l.company),
    ),
    jobTitle: pick(
      keeper.jobTitle,
      losers.map((l) => l.jobTitle),
    ),
    notes: [keeper.notes, ...losers.map((l) => l.notes)]
      .filter((n): n is string => Boolean(n && n.trim()))
      .join("\n\n---\n\n") || null,
    tags: Array.from(
      new Set<string>([
        ...(keeper.tags ?? []),
        ...losers.flatMap((l) => l.tags ?? []),
      ]),
    ),
    updatedAt: new Date(),
  };

  await db.update(contacts).set(next).where(eq(contacts.id, keeperId));

  await db.delete(contacts).where(inArray(contacts.id, loserIds));

  try {
    await logAudit({
      userId: profile.id,
      pillarId: keeper.pillarId,
      entityType: "contact",
      entityId: keeperId,
      action: "update",
      diff: {
        merge: true,
        keeper: { before: keeper, after: { ...keeper, ...next } },
        losers,
      },
    });
    for (const l of losers) {
      await logAudit({
        userId: profile.id,
        pillarId: l.pillarId,
        entityType: "contact",
        entityId: l.id,
        action: "delete",
        diff: { mergedInto: keeperId, snapshot: l },
      });
    }
  } catch (err) {
    console.error("[crm/dedup] audit failed:", err);
  }

  revalidatePath("/crm");
  revalidatePath("/crm/dedup");
  return { ok: true };
}
