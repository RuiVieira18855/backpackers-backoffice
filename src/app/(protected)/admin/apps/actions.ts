"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { appAccess } from "@/lib/db/schema";
import { requireSkill } from "@/lib/dal";
import { logAudit } from "@/lib/audit";

const STATUSES = ["none", "trial", "active", "expired", "revoked"] as const;
type Status = Exclude<(typeof STATUSES)[number], "none">;
const APP = "cairn";

// Grant / change / revoke a user's Cairn access. "none" removes the entitlement.
export async function setCairnAccess(formData: FormData): Promise<void> {
  const profile = await requireSkill("admin");

  const userId = String(formData.get("userId") ?? "");
  const status = String(formData.get("status") ?? "none");
  const planRaw = String(formData.get("plan") ?? "").trim();
  const expiresRaw = String(formData.get("expiresAt") ?? "").trim();
  if (!userId || !STATUSES.includes(status as (typeof STATUSES)[number])) return;

  const plan = planRaw || null;
  const expiresAt = expiresRaw ? new Date(expiresRaw) : null;

  if (status === "none") {
    await db.delete(appAccess).where(and(eq(appAccess.userId, userId), eq(appAccess.app, APP)));
  } else {
    await db
      .insert(appAccess)
      .values({ userId, app: APP, status: status as Status, plan, expiresAt, grantedBy: profile.id })
      .onConflictDoUpdate({
        target: [appAccess.userId, appAccess.app],
        set: { status: status as Status, plan, expiresAt, grantedBy: profile.id, updatedAt: new Date() },
      });
  }

  try {
    await logAudit({
      userId: profile.id,
      pillarId: null,
      entityType: "app_access",
      entityId: userId,
      action: status === "none" ? "delete" : "update",
      diff: { app: APP, status, plan, expiresAt: expiresRaw || null },
    });
  } catch {
    /* audit is best-effort; never block the access change */
  }

  revalidatePath("/admin/apps");
}
