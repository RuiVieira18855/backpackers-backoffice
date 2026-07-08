"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { webhooks } from "@/lib/db/schema";
import { requireSkill } from "@/lib/dal";
import { logAudit } from "@/lib/audit";
import {
  generateSecret,
  sendTestWebhook,
  WEBHOOK_EVENTS,
} from "@/lib/webhooks";

export type WebhookFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const schema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  isActive: z.boolean().default(true),
});

export async function createWebhook(
  _prev: WebhookFormState | undefined,
  formData: FormData,
): Promise<WebhookFormState> {
  const profile = await requireSkill("admin");

  const raw = {
    name: String(formData.get("name") ?? "").trim(),
    url: String(formData.get("url") ?? "").trim(),
    events: formData.getAll("events").map(String),
    isActive: formData.get("isActive") === "on",
  };
  if (!raw.name) return { fieldErrors: { name: "Nome obrigatório." } };
  if (!raw.url) return { fieldErrors: { url: "URL obrigatório." } };
  if (raw.events.length === 0)
    return { fieldErrors: { events: "Escolhe pelo menos um evento." } };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Dados inválidos. Confirma que o URL é válido." };
  }
  // Only allow known events; drop anything else silently.
  const events = parsed.data.events.filter((e) =>
    (WEBHOOK_EVENTS as readonly string[]).includes(e),
  );
  if (events.length === 0) {
    return { fieldErrors: { events: "Nenhum evento válido." } };
  }

  const [created] = await db
    .insert(webhooks)
    .values({
      name: parsed.data.name,
      url: parsed.data.url,
      secret: generateSecret(),
      events,
      isActive: parsed.data.isActive,
      createdBy: profile.id,
    })
    .returning();

  try {
    await logAudit({
      userId: profile.id,
      entityType: "webhook",
      entityId: created.id,
      action: "create",
      diff: { name: created.name, url: created.url, events: created.events },
    });
  } catch {
    /* audit best-effort */
  }

  revalidatePath("/admin/webhooks");
  return {};
}

export async function updateWebhook(
  id: string,
  _prev: WebhookFormState | undefined,
  formData: FormData,
): Promise<WebhookFormState> {
  const profile = await requireSkill("admin");
  const raw = {
    name: String(formData.get("name") ?? "").trim(),
    url: String(formData.get("url") ?? "").trim(),
    events: formData.getAll("events").map(String),
    isActive: formData.get("isActive") === "on",
  };
  if (!raw.name) return { fieldErrors: { name: "Nome obrigatório." } };
  if (!raw.url) return { fieldErrors: { url: "URL obrigatório." } };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: "Dados inválidos." };
  const events = parsed.data.events.filter((e) =>
    (WEBHOOK_EVENTS as readonly string[]).includes(e),
  );

  const [after] = await db
    .update(webhooks)
    .set({
      name: parsed.data.name,
      url: parsed.data.url,
      events,
      isActive: parsed.data.isActive,
      updatedAt: new Date(),
    })
    .where(eq(webhooks.id, id))
    .returning();

  try {
    await logAudit({
      userId: profile.id,
      entityType: "webhook",
      entityId: id,
      action: "update",
      diff: { after },
    });
  } catch {
    /* audit best-effort */
  }

  revalidatePath("/admin/webhooks");
  revalidatePath(`/admin/webhooks/${id}`);
  return {};
}

export async function rotateWebhookSecret(id: string): Promise<void> {
  const profile = await requireSkill("admin");
  const newSecret = generateSecret();
  await db
    .update(webhooks)
    .set({ secret: newSecret, updatedAt: new Date() })
    .where(eq(webhooks.id, id));
  try {
    await logAudit({
      userId: profile.id,
      entityType: "webhook",
      entityId: id,
      action: "update",
      diff: { secretRotated: true },
    });
  } catch {
    /* best-effort */
  }
  revalidatePath(`/admin/webhooks/${id}`);
}

export async function deleteWebhookAction(id: string): Promise<void> {
  const profile = await requireSkill("admin");
  const before = await db.query.webhooks.findFirst({
    where: eq(webhooks.id, id),
  });
  if (!before) return;
  await db.delete(webhooks).where(eq(webhooks.id, id));
  try {
    await logAudit({
      userId: profile.id,
      entityType: "webhook",
      entityId: id,
      action: "delete",
      diff: { snapshot: before },
    });
  } catch {
    /* best-effort */
  }
  revalidatePath("/admin/webhooks");
}

export async function testWebhookAction(id: string): Promise<void> {
  await requireSkill("admin");
  await sendTestWebhook(id);
  revalidatePath(`/admin/webhooks/${id}`);
}
