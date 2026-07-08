"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/dal";
import { logAudit } from "@/lib/audit";
import { deleteConnection, setSyncMetadata } from "@/lib/oauth/store";
import { pullExternalEvents } from "@/lib/oauth/sync";
import type { OAuthProvider } from "@/lib/oauth/store";

const PROVIDERS: OAuthProvider[] = ["google", "microsoft"];

function assertProvider(p: string): OAuthProvider {
  if (!(PROVIDERS as string[]).includes(p)) {
    throw new Error(`Unknown provider: ${p}`);
  }
  return p as OAuthProvider;
}

export async function updateCalendarPillar(
  provider: string,
  pillarId: string | null,
): Promise<void> {
  const profile = await requireProfile();
  const p = assertProvider(provider);
  await setSyncMetadata(profile.id, p, { defaultPillarId: pillarId });
  try {
    await logAudit({
      userId: profile.id,
      entityType: "oauth_connection",
      action: "update",
      diff: { provider: p, defaultPillarId: pillarId },
    });
  } catch {
    /* best-effort */
  }
  revalidatePath("/settings");
}

export async function syncCalendarNow(
  provider: string,
): Promise<{
  ok: boolean;
  inserted: number;
  updated: number;
  skipped: number;
  error?: string;
}> {
  const profile = await requireProfile();
  const p = assertProvider(provider);
  const result = await pullExternalEvents(profile.id, p);
  revalidatePath("/settings");
  revalidatePath("/ops/events");
  if (result.error) {
    return { ok: false, ...result };
  }
  return { ok: true, ...result };
}

export async function disconnectCalendar(provider: string): Promise<void> {
  const profile = await requireProfile();
  const p = assertProvider(provider);
  await deleteConnection(profile.id, p);
  try {
    await logAudit({
      userId: profile.id,
      entityType: "oauth_connection",
      action: "delete",
      diff: { provider: p },
    });
  } catch {
    /* best-effort */
  }
  revalidatePath("/settings");
}
