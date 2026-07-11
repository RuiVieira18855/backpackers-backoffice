"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { requireRole } from "@/lib/dal";
import { logAudit } from "@/lib/audit";
import {
  getCustomFieldDefs,
  parseCustomFieldsFromFormData,
} from "@/lib/custom-fields";
import { runWorkflows } from "@/lib/workflows";
import { dispatchWebhook } from "@/lib/webhooks";
import type { ContactFormState } from "@/components/contacts/contact-form";

const CONTACT_TYPES = ["lead", "customer", "partner", "vendor"] as const;
const CONTACT_STAGES = [
  "new",
  "qualified",
  "active",
  "on_hold",
  "closed_won",
  "closed_lost",
] as const;
const CONTACT_SOURCES = [
  "website",
  "referral",
  "event",
  "inbound",
  "cold",
  "other",
] as const;

const schema = z.object({
  id: z.uuid(),
  fullName: z.string().min(1),
  pillarId: z.uuid(),
  type: z.enum(CONTACT_TYPES),
  stage: z.enum(CONTACT_STAGES),
  source: z.enum(CONTACT_SOURCES).optional(),
  email: z.email().optional().or(z.literal("")),
  phone: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  notes: z.string().optional(),
});

export async function updateContact(
  _prev: ContactFormState | undefined,
  formData: FormData,
): Promise<ContactFormState> {
  const profile = await requireRole("admin_grupo", "admin_pilar");
  const tErrors = await getTranslations("crm.form.errors");

  const raw = {
    id: String(formData.get("id") ?? ""),
    fullName: String(formData.get("fullName") ?? "").trim(),
    pillarId: String(formData.get("pillarId") ?? ""),
    type: formData.get("type") as string,
    stage: formData.get("stage") as string,
    source: (formData.get("source") || undefined) as string | undefined,
    email: String(formData.get("email") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    company: String(formData.get("company") ?? "").trim(),
    jobTitle: String(formData.get("jobTitle") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
  };

  if (!raw.fullName) {
    return { fieldErrors: { fullName: tErrors("nameRequired") } };
  }
  if (!raw.pillarId) {
    return { fieldErrors: { pillarId: tErrors("pillarRequired") } };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const flat = z.flattenError(parsed.error);
    const first = Object.entries(flat.fieldErrors)[0];
    return {
      error: first ? `${first[0]}: ${first[1]?.[0] ?? ""}` : "Invalid data",
    };
  }

  const before = await db.query.contacts.findFirst({
    where: eq(contacts.id, parsed.data.id),
  });
  if (!before) {
    return { error: "Contacto não encontrado." };
  }

  const customDefs = await getCustomFieldDefs("contact");
  const customFields = parseCustomFieldsFromFormData(formData, customDefs);

  const [updated] = await db
    .update(contacts)
    .set({
      fullName: parsed.data.fullName,
      pillarId: parsed.data.pillarId,
      type: parsed.data.type,
      stage: parsed.data.stage,
      source: parsed.data.source,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      company: parsed.data.company || null,
      jobTitle: parsed.data.jobTitle || null,
      notes: parsed.data.notes || null,
      customFields,
    })
    .where(eq(contacts.id, parsed.data.id))
    .returning();

  await logAudit({
    userId: profile.id,
    pillarId: updated.pillarId,
    entityType: "contact",
    entityId: updated.id,
    action: "update",
    diff: { before, after: updated },
  });

  // Fire stage-change workflows only when stage actually changed.
  if (before.stage !== updated.stage) {
    await runWorkflows("contact.stage_changed", updated, {
      userId: profile.id,
      entityType: "contact",
      entityId: updated.id,
    });
    await dispatchWebhook("contact.stage_changed", {
      id: updated.id,
      fullName: updated.fullName,
      from: before.stage,
      to: updated.stage,
      pillarId: updated.pillarId,
    });
  }

  redirect(`/crm/contacts/${updated.id}`);
}

export async function deleteContact(id: string): Promise<void> {
  const profile = await requireRole("admin_grupo", "admin_pilar");

  const before = await db.query.contacts.findFirst({
    where: eq(contacts.id, id),
  });
  if (!before) {
    redirect("/crm");
  }

  await db.delete(contacts).where(eq(contacts.id, id));

  await logAudit({
    userId: profile.id,
    pillarId: before.pillarId,
    entityType: "contact",
    entityId: id,
    action: "delete",
    diff: { snapshot: before },
  });

  redirect("/crm");
}
