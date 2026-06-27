"use server";

import { redirect } from "next/navigation";
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
  fullName: z.string().min(1),
  pillarId: z.string().uuid(),
  type: z.enum(CONTACT_TYPES),
  stage: z.enum(CONTACT_STAGES),
  source: z.enum(CONTACT_SOURCES).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  notes: z.string().optional(),
});

export async function createContact(
  _prev: ContactFormState | undefined,
  formData: FormData,
): Promise<ContactFormState> {
  const profile = await requireRole("admin_grupo", "admin_pilar");
  const tErrors = await getTranslations("crm.form.errors");

  const raw = {
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
    const flat = parsed.error.flatten();
    const first = Object.entries(flat.fieldErrors)[0];
    return {
      error: first ? `${first[0]}: ${first[1]?.[0] ?? ""}` : "Invalid data",
    };
  }

  const customDefs = await getCustomFieldDefs("contact");
  const customFields = parseCustomFieldsFromFormData(formData, customDefs);

  const [created] = await db
    .insert(contacts)
    .values({
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
      ownerId: profile.id,
    })
    .returning();

  await logAudit({
    userId: profile.id,
    pillarId: created.pillarId,
    entityType: "contact",
    entityId: created.id,
    action: "create",
    diff: { snapshot: created },
  });

  redirect(`/crm/contacts/${created.id}`);
}
