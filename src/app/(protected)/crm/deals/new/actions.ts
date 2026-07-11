"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { deals } from "@/lib/db/schema";
import { requireProfile } from "@/lib/dal";
import { logAudit } from "@/lib/audit";
import {
  getCustomFieldDefs,
  parseCustomFieldsFromFormData,
} from "@/lib/custom-fields";
import type { DealFormState } from "@/components/deals/deal-form";

const STAGES = ["lead", "qualified", "proposal", "negotiation", "won", "lost"] as const;

const schema = z.object({
  name: z.string().min(1),
  pillarId: z.uuid(),
  stage: z.enum(STAGES),
  contactId: z.uuid().nullable(),
  value: z.string().regex(/^(\d+(\.\d{1,2})?)?$/),
  currency: z.string().min(1).max(8),
  expectedCloseDate: z.string().nullable(),
  description: z.string().optional(),
  notes: z.string().optional(),
});

export async function createDeal(
  _prev: DealFormState | undefined,
  formData: FormData,
): Promise<DealFormState> {
  const profile = await requireProfile();

  const raw = {
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

  if (!raw.name) {
    return { fieldErrors: { name: "Nome obrigatório." } };
  }
  if (!raw.pillarId) {
    return { fieldErrors: { pillarId: "Pilar obrigatório." } };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const flat = z.flattenError(parsed.error);
    const first = Object.entries(flat.fieldErrors)[0];
    return {
      error: first ? `${first[0]}: ${first[1]?.[0] ?? ""}` : "Invalid data",
    };
  }

  const closedAt =
    parsed.data.stage === "won" || parsed.data.stage === "lost"
      ? new Date()
      : null;

  const customDefs = await getCustomFieldDefs("deal");
  const customFields = parseCustomFieldsFromFormData(formData, customDefs);

  const [created] = await db
    .insert(deals)
    .values({
      name: parsed.data.name,
      pillarId: parsed.data.pillarId,
      stage: parsed.data.stage,
      contactId: parsed.data.contactId,
      value: parsed.data.value || null,
      currency: parsed.data.currency,
      expectedCloseDate: parsed.data.expectedCloseDate,
      description: parsed.data.description || null,
      notes: parsed.data.notes || null,
      customFields,
      ownerId: profile.id,
      closedAt,
    })
    .returning();

  await logAudit({
    userId: profile.id,
    pillarId: created.pillarId,
    entityType: "deal",
    entityId: created.id,
    action: "create",
    diff: { snapshot: created },
  });

  redirect(`/crm/deals/${created.id}`);
}
