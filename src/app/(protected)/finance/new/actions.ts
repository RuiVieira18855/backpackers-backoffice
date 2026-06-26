"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, projects, transactions } from "@/lib/db/schema";
import { requireSkill } from "@/lib/dal";
import { logAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import type { TransactionFormState } from "@/components/finance/transaction-form";

const TYPES = ["income", "expense"] as const;
const STATUSES = ["pending", "paid", "overdue", "cancelled"] as const;

const schema = z.object({
  type: z.enum(TYPES),
  category: z.string().optional(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount"),
  currency: z.string().min(1).max(8),
  description: z.string().min(1),
  date: z.string(),
  invoiceNumber: z.string().optional(),
  vendor: z.string().optional(),
  status: z.enum(STATUSES),
  dueDate: z.string().nullable(),
  pillarId: z.string().uuid().nullable(),
  eventId: z.string().uuid().nullable(),
  projectId: z.string().uuid().nullable(),
  notes: z.string().optional(),
});

export async function createTransaction(
  _prev: TransactionFormState | undefined,
  formData: FormData,
): Promise<TransactionFormState> {
  // FINANCE = skill-gated (super_user implicit)
  const profile = await requireSkill("finance");
  const tErrors = await getTranslations("finance.form.errors");

  const raw = {
    type: formData.get("type") as string,
    category: String(formData.get("category") ?? "").trim(),
    amount: String(formData.get("amount") ?? "").trim(),
    currency: String(formData.get("currency") ?? "EUR").trim(),
    description: String(formData.get("description") ?? "").trim(),
    date: String(formData.get("date") ?? ""),
    invoiceNumber: String(formData.get("invoiceNumber") ?? "").trim(),
    vendor: String(formData.get("vendor") ?? "").trim(),
    status: formData.get("status") as string,
    dueDate: String(formData.get("dueDate") ?? "") || null,
    pillarId: String(formData.get("pillarId") ?? "") || null,
    eventId: String(formData.get("eventId") ?? "") || null,
    projectId: String(formData.get("projectId") ?? "") || null,
    notes: String(formData.get("notes") ?? "").trim(),
  };
  const returnTo = String(formData.get("returnTo") ?? "").trim();

  if (!raw.amount || !/^\d+(\.\d{1,2})?$/.test(raw.amount)) {
    return { fieldErrors: { amount: tErrors("amountInvalid") } };
  }
  if (!raw.description) {
    return { fieldErrors: { description: tErrors("descriptionRequired") } };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const first = Object.entries(flat.fieldErrors)[0];
    return {
      error: first ? `${first[0]}: ${first[1]?.[0] ?? ""}` : "Invalid data",
    };
  }

  // Auto-stamp paid_at when creating with status=paid
  const paidAt = parsed.data.status === "paid" ? new Date() : null;

  const [created] = await db
    .insert(transactions)
    .values({
      type: parsed.data.type,
      category: parsed.data.category || null,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      description: parsed.data.description,
      date: parsed.data.date,
      invoiceNumber: parsed.data.invoiceNumber || null,
      vendor: parsed.data.vendor || null,
      status: parsed.data.status,
      dueDate: parsed.data.dueDate,
      pillarId: parsed.data.pillarId,
      eventId: parsed.data.eventId,
      projectId: parsed.data.projectId,
      notes: parsed.data.notes || null,
      paidAt,
      createdBy: profile.id,
    })
    .returning();

  await logAudit({
    userId: profile.id,
    pillarId: created.pillarId,
    entityType: "transaction",
    entityId: created.id,
    action: "create",
    diff: { snapshot: created },
  });

  // Notify the event/project owner when a transaction is linked to one.
  try {
    if (created.eventId) {
      const ev = await db.query.events.findFirst({
        where: eq(events.id, created.eventId),
        columns: { id: true, name: true, ownerId: true },
      });
      if (ev?.ownerId) {
        await createNotification({
          userId: ev.ownerId,
          actorId: profile.id,
          pillarId: created.pillarId,
          kind: "event_finance",
          title: `Movimento em «${ev.name}»: ${created.description}`,
          body: `${created.type === "income" ? "+" : "−"}${created.amount} ${created.currency}`,
          link: `/ops/events/${ev.id}`,
        });
      }
    } else if (created.projectId) {
      const pr = await db.query.projects.findFirst({
        where: eq(projects.id, created.projectId),
        columns: { id: true, name: true, ownerId: true },
      });
      if (pr?.ownerId) {
        await createNotification({
          userId: pr.ownerId,
          actorId: profile.id,
          pillarId: created.pillarId,
          kind: "project_finance",
          title: `Movimento em «${pr.name}»: ${created.description}`,
          body: `${created.type === "income" ? "+" : "−"}${created.amount} ${created.currency}`,
          link: `/ops/projects/${pr.id}`,
        });
      }
    }
  } catch (err) {
    console.error("[notifications] linked finance failed:", err);
  }

  // Only allow internal returnTo (must start with /) to prevent open redirects
  if (returnTo.startsWith("/")) {
    redirect(returnTo);
  }
  redirect(`/finance/${created.id}`);
}
