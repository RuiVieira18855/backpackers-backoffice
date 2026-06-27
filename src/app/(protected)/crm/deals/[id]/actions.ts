"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { deals } from "@/lib/db/schema";
import { requireProfile } from "@/lib/dal";
import { logAudit } from "@/lib/audit";
import type { DealFormState } from "@/components/deals/deal-form";

const STAGES = ["lead", "qualified", "proposal", "negotiation", "won", "lost"] as const;

const schema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  pillarId: z.string().uuid(),
  stage: z.enum(STAGES),
  contactId: z.string().uuid().nullable(),
  value: z.string().regex(/^(\d+(\.\d{1,2})?)?$/),
  currency: z.string().min(1).max(8),
  expectedCloseDate: z.string().nullable(),
  description: z.string().optional(),
  notes: z.string().optional(),
});

export async function updateDeal(
  _prev: DealFormState | undefined,
  formData: FormData,
): Promise<DealFormState> {
  const profile = await requireProfile();

  const raw = {
    id: String(formData.get("id") ?? ""),
    name: String(formData.get("name") ?? "").trim(),
    pillarId: String(formData.get("pillarId") ?? ""),
    stage: formData.get("stage") as string,
    contactId: String(formData.get("contactId") ?? "") || null,
    value: String(formData.get("value") ?? "").trim(),
    currency: String(formData.get("currency") ?? "EUR").trim(),
    expectedCloseDate: String(formData.get("expectedCloseDate") ?? "") || null,
    description: String(formData.get("description") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
  };

  if (!raw.name) return { fieldErrors: { name: "Nome obrigatório." } };
  if (!raw.pillarId) return { fieldErrors: { pillarId: "Pilar obrigatório." } };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Dados inválidos." };
  }

  const before = await db.query.deals.findFirst({
    where: eq(deals.id, parsed.data.id),
  });
  if (!before) return { error: "Deal não encontrado." };

  // Auto-stamp closed_at on stage transitions in/out of terminal stages.
  let closedAt = before.closedAt;
  const isClosing =
    (parsed.data.stage === "won" || parsed.data.stage === "lost") &&
    before.stage !== "won" &&
    before.stage !== "lost";
  const isReopening =
    parsed.data.stage !== "won" &&
    parsed.data.stage !== "lost" &&
    (before.stage === "won" || before.stage === "lost");
  if (isClosing) closedAt = new Date();
  else if (isReopening) closedAt = null;

  const [updated] = await db
    .update(deals)
    .set({
      name: parsed.data.name,
      pillarId: parsed.data.pillarId,
      stage: parsed.data.stage,
      contactId: parsed.data.contactId,
      value: parsed.data.value || null,
      currency: parsed.data.currency,
      expectedCloseDate: parsed.data.expectedCloseDate,
      description: parsed.data.description || null,
      notes: parsed.data.notes || null,
      closedAt,
      updatedAt: new Date(),
    })
    .where(eq(deals.id, parsed.data.id))
    .returning();

  await logAudit({
    userId: profile.id,
    pillarId: updated.pillarId,
    entityType: "deal",
    entityId: updated.id,
    action: "update",
    diff: { before, after: updated },
  });

  redirect(`/crm/deals/${updated.id}`);
}

export async function deleteDeal(id: string): Promise<void> {
  const profile = await requireProfile();
  const before = await db.query.deals.findFirst({
    where: eq(deals.id, id),
  });
  if (!before) redirect("/crm/deals");
  await db.delete(deals).where(eq(deals.id, id));
  await logAudit({
    userId: profile.id,
    pillarId: before.pillarId,
    entityType: "deal",
    entityId: id,
    action: "delete",
    diff: { snapshot: before },
  });
  redirect("/crm/deals");
}

/**
 * Move a deal between stages — used by the pipeline kanban drag.
 */
export async function moveDealStage(
  id: string,
  stage: (typeof STAGES)[number],
): Promise<{ ok: boolean }> {
  if (!(STAGES as readonly string[]).includes(stage)) return { ok: false };
  const profile = await requireProfile();
  const before = await db.query.deals.findFirst({
    where: eq(deals.id, id),
  });
  if (!before) return { ok: false };

  let closedAt = before.closedAt;
  if ((stage === "won" || stage === "lost") && before.stage !== stage) {
    closedAt = new Date();
  } else if (stage !== "won" && stage !== "lost" && before.closedAt) {
    closedAt = null;
  }

  const [updated] = await db
    .update(deals)
    .set({ stage, closedAt, updatedAt: new Date() })
    .where(eq(deals.id, id))
    .returning();

  await logAudit({
    userId: profile.id,
    pillarId: updated.pillarId,
    entityType: "deal",
    entityId: id,
    action: "update",
    diff: { stageChange: { from: before.stage, to: stage } },
  });
  return { ok: true };
}
