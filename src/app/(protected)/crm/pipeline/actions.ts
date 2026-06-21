"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { requireRole } from "@/lib/dal";
import { logAudit } from "@/lib/audit";

const STAGES = [
  "new",
  "qualified",
  "active",
  "on_hold",
  "closed_won",
  "closed_lost",
] as const;
type Stage = (typeof STAGES)[number];

function isStage(value: string): value is Stage {
  return (STAGES as readonly string[]).includes(value);
}

/**
 * Move a contact between pipeline stages. Called from the kanban board's
 * drag-end handler. RLS enforces the user can actually update this contact;
 * we just verify role and validate the stage value.
 */
export async function moveContactToStage(
  contactId: string,
  newStage: string,
): Promise<{ ok: boolean; error?: string }> {
  const profile = await requireRole("admin_grupo", "admin_pilar");

  if (!isStage(newStage)) {
    return { ok: false, error: "Invalid stage" };
  }

  const before = await db.query.contacts.findFirst({
    where: eq(contacts.id, contactId),
  });
  if (!before) {
    return { ok: false, error: "Contact not found" };
  }
  if (before.stage === newStage) {
    return { ok: true }; // no-op
  }

  const [updated] = await db
    .update(contacts)
    .set({ stage: newStage })
    .where(eq(contacts.id, contactId))
    .returning();

  await logAudit({
    userId: profile.id,
    pillarId: updated.pillarId,
    entityType: "contact",
    entityId: updated.id,
    action: "update",
    diff: { before: { stage: before.stage }, after: { stage: updated.stage } },
  });

  revalidatePath("/crm/pipeline");
  return { ok: true };
}
