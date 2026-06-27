"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { appAccess, apps } from "@/lib/db/schema";
import { requireSkill } from "@/lib/dal";
import { logAudit } from "@/lib/audit";

const STATUSES = ["none", "trial", "active", "expired", "revoked"] as const;
type Status = Exclude<(typeof STATUSES)[number], "none">;

/**
 * Grant / change / revoke a user's access to a given app.
 *
 * - "none" deletes the row (so the user has no entitlement at all).
 * - Any other status upserts on (user_id, app).
 * - logAudit best-effort; failure never blocks the access change.
 */
export async function setAppAccess(formData: FormData): Promise<void> {
  const profile = await requireSkill("admin");

  const userId = String(formData.get("userId") ?? "");
  const appKey = String(formData.get("appKey") ?? "");
  const status = String(formData.get("status") ?? "none");
  const planRaw = String(formData.get("plan") ?? "").trim();
  const expiresRaw = String(formData.get("expiresAt") ?? "").trim();

  if (!userId || !appKey) return;
  if (!(STATUSES as readonly string[]).includes(status)) return;

  const plan = planRaw || null;
  const expiresAt = expiresRaw ? new Date(expiresRaw) : null;

  if (status === "none") {
    await db
      .delete(appAccess)
      .where(and(eq(appAccess.userId, userId), eq(appAccess.app, appKey)));
  } else {
    await db
      .insert(appAccess)
      .values({
        userId,
        app: appKey,
        status: status as Status,
        plan,
        expiresAt,
        grantedBy: profile.id,
      })
      .onConflictDoUpdate({
        target: [appAccess.userId, appAccess.app],
        set: {
          status: status as Status,
          plan,
          expiresAt,
          grantedBy: profile.id,
          updatedAt: new Date(),
        },
      });
  }

  try {
    await logAudit({
      userId: profile.id,
      pillarId: null,
      entityType: "app_access",
      entityId: userId,
      action: status === "none" ? "delete" : "update",
      diff: { app: appKey, status, plan, expiresAt: expiresRaw || null },
    });
  } catch {
    /* audit best-effort */
  }

  revalidatePath(`/admin/apps/${appKey}`);
  revalidatePath("/admin/apps");
}

// ---------------- App catalog management ----------------

const newAppSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_-]*$/, "Letras minúsculas / hífenes / underscores."),
  name: z.string().min(1),
  description: z.string().optional(),
  icon: z.string().optional(),
  url: z.string().url().optional().or(z.literal("")),
});

export type NewAppState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function createApp(
  _prev: NewAppState | undefined,
  formData: FormData,
): Promise<NewAppState> {
  const profile = await requireSkill("admin");

  const raw = {
    key: String(formData.get("key") ?? "").trim().toLowerCase(),
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    icon: String(formData.get("icon") ?? "").trim(),
    url: String(formData.get("url") ?? "").trim(),
  };

  if (!raw.key) return { fieldErrors: { key: "Chave obrigatória." } };
  if (!raw.name) return { fieldErrors: { name: "Nome obrigatório." } };

  const parsed = newAppSchema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const first = Object.entries(flat.fieldErrors)[0];
    return {
      error: first ? `${first[0]}: ${first[1]?.[0] ?? ""}` : "Dados inválidos.",
    };
  }

  try {
    await db.insert(apps).values({
      key: parsed.data.key,
      name: parsed.data.name,
      description: parsed.data.description || null,
      icon: parsed.data.icon || null,
      url: parsed.data.url || null,
    });
    await logAudit({
      userId: profile.id,
      pillarId: null,
      entityType: "app",
      entityId: null,
      action: "create",
      diff: { snapshot: parsed.data },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/duplicate key|unique/i.test(msg)) {
      return { fieldErrors: { key: "Já existe uma app com essa chave." } };
    }
    return { error: msg };
  }

  revalidatePath("/admin/apps");
  return {};
}

export async function deleteApp(key: string): Promise<void> {
  const profile = await requireSkill("admin");
  await db.delete(apps).where(eq(apps.key, key));
  // Note: app_access rows for this key are left behind intentionally so
  // we don't accidentally lose audit-relevant entitlement history. They
  // become "orphan" but the catalog page just won't list them anymore.
  await logAudit({
    userId: profile.id,
    pillarId: null,
    entityType: "app",
    entityId: null,
    action: "delete",
    diff: { key },
  });
  revalidatePath("/admin/apps");
}
