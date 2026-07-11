"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { requireProfile } from "@/lib/dal";
import { logAudit } from "@/lib/audit";
import { supabaseAdmin, AVATARS_BUCKET } from "@/lib/supabase/admin";

export type SettingsState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: string;
};

const MAX_AVATAR_SIZE = 1 * 1024 * 1024; // 1 MB
const ALLOWED_AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

const schema = z.object({
  fullName: z.string().min(1).max(120),
  defaultPillarId: z.uuid().nullable(),
});

export async function updateOwnProfile(
  _prev: SettingsState | undefined,
  formData: FormData,
): Promise<SettingsState> {
  const profile = await requireProfile();
  const tErrors = await getTranslations("settings.errors");

  const raw = {
    fullName: String(formData.get("fullName") ?? "").trim(),
    defaultPillarId:
      String(formData.get("defaultPillarId") ?? "") || null,
  };

  if (!raw.fullName) {
    return { fieldErrors: { fullName: tErrors("nameRequired") } };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Invalid data" };
  }

  // Optional avatar upload
  let avatarUrl = profile.avatarUrl;
  const avatarFile = formData.get("avatar");
  if (avatarFile && avatarFile instanceof File && avatarFile.size > 0) {
    if (!ALLOWED_AVATAR_TYPES.includes(avatarFile.type)) {
      return { fieldErrors: { avatar: tErrors("avatarType") } };
    }
    if (avatarFile.size > MAX_AVATAR_SIZE) {
      return { fieldErrors: { avatar: tErrors("avatarTooLarge") } };
    }

    const ext = (avatarFile.name.split(".").pop() ?? "png").toLowerCase();
    const path = `${profile.id}/avatar-${Date.now()}.${ext}`;
    const buffer = Buffer.from(await avatarFile.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage
      .from(AVATARS_BUCKET)
      .upload(path, buffer, {
        contentType: avatarFile.type,
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      return { error: `Avatar: ${uploadError.message}` };
    }

    const { data: pub } = supabaseAdmin.storage
      .from(AVATARS_BUCKET)
      .getPublicUrl(path);
    avatarUrl = pub.publicUrl;
  }

  const [updated] = await db
    .update(profiles)
    .set({
      fullName: parsed.data.fullName,
      defaultPillarId: parsed.data.defaultPillarId,
      avatarUrl,
    })
    .where(eq(profiles.id, profile.id))
    .returning();

  await logAudit({
    userId: profile.id,
    pillarId: null,
    entityType: "profile",
    entityId: profile.id,
    action: "update",
    diff: {
      before: {
        fullName: profile.fullName,
        defaultPillarId: profile.defaultPillarId,
        avatarUrl: profile.avatarUrl,
      },
      after: {
        fullName: updated.fullName,
        defaultPillarId: updated.defaultPillarId,
        avatarUrl: updated.avatarUrl,
      },
    },
  });

  redirect("/settings");
}
