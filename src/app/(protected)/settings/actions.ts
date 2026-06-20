"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { requireProfile } from "@/lib/dal";
import { logAudit } from "@/lib/audit";

export type SettingsState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: string;
};

const schema = z.object({
  fullName: z.string().min(1).max(120),
});

export async function updateOwnProfile(
  _prev: SettingsState | undefined,
  formData: FormData,
): Promise<SettingsState> {
  const profile = await requireProfile();
  const tErrors = await getTranslations("settings.errors");
  const tSuccess = await getTranslations("settings");

  const raw = {
    fullName: String(formData.get("fullName") ?? "").trim(),
  };

  if (!raw.fullName) {
    return { fieldErrors: { fullName: tErrors("nameRequired") } };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Invalid data" };
  }

  const before = profile;

  const [updated] = await db
    .update(profiles)
    .set({ fullName: parsed.data.fullName })
    .where(eq(profiles.id, profile.id))
    .returning();

  await logAudit({
    userId: profile.id,
    pillarId: null,
    entityType: "profile",
    entityId: profile.id,
    action: "update",
    diff: { before: { fullName: before.fullName }, after: { fullName: updated.fullName } },
  });

  // Re-render with fresh data
  redirect("/settings");
}
