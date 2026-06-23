"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { requireRole } from "@/lib/dal";
import { logAudit } from "@/lib/audit";
import type { TransactionFormState } from "@/components/finance/transaction-form";

const TYPES = ["income", "expense"] as const;
const STATUSES = ["pending", "paid", "overdue", "cancelled"] as const;

const schema = z.object({
  id: z.string().uuid(),
  type: z.enum(TYPES),
  category: z.string().optional(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currency: z.string().min(1).max(8),
  description: z.string().min(1),
  date: z.string(),
  invoiceNumber: z.string().optional(),
  vendor: z.string().optional(),
  status: z.enum(STATUSES),
  dueDate: z.string().nullable(),
  pillarId: z.string().uuid().nullable(),
  notes: z.string().optional(),
});

export async function updateTransaction(
  _prev: TransactionFormState | undefined,
  formData: FormData,
): Promise<TransactionFormState> {
  const profile = await requireRole("super_user");
  const tErrors = await getTranslations("finance.form.errors");

  const raw = {
    id: String(formData.get("id") ?? ""),
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
    notes: String(formData.get("notes") ?? "").trim(),
  };

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

  const before = await db.query.transactions.findFirst({
    where: eq(transactions.id, parsed.data.id),
  });
  if (!before) {
    return { error: "Transação não encontrada." };
  }

  // Auto paid_at logic: stamp when status crosses into paid, clear when out
  let paidAt = before.paidAt;
  if (parsed.data.status === "paid" && before.status !== "paid") {
    paidAt = new Date();
  } else if (parsed.data.status !== "paid" && before.status === "paid") {
    paidAt = null;
  }

  const [updated] = await db
    .update(transactions)
    .set({
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
      notes: parsed.data.notes || null,
      paidAt,
    })
    .where(eq(transactions.id, parsed.data.id))
    .returning();

  await logAudit({
    userId: profile.id,
    pillarId: updated.pillarId,
    entityType: "transaction",
    entityId: updated.id,
    action: "update",
    diff: { before, after: updated },
  });

  redirect(`/finance/${updated.id}`);
}

export async function deleteTransaction(id: string): Promise<void> {
  const profile = await requireRole("super_user");

  const before = await db.query.transactions.findFirst({
    where: eq(transactions.id, id),
  });
  if (!before) redirect("/finance");

  await db.delete(transactions).where(eq(transactions.id, id));

  await logAudit({
    userId: profile.id,
    pillarId: before.pillarId,
    entityType: "transaction",
    entityId: id,
    action: "delete",
    diff: { snapshot: before },
  });

  redirect("/finance");
}
