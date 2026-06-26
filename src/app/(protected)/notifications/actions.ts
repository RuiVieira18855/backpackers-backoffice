"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { requireProfile } from "@/lib/dal";

export async function markAsRead(id: string): Promise<void> {
  const profile = await requireProfile();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(eq(notifications.id, id), eq(notifications.userId, profile.id)),
    );
  revalidatePath("/notifications");
}

export async function markManyAsRead(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const profile = await requireProfile();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        inArray(notifications.id, ids),
        eq(notifications.userId, profile.id),
      ),
    );
  revalidatePath("/notifications");
}

export async function markAllAsRead(): Promise<void> {
  const profile = await requireProfile();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.userId, profile.id),
        isNull(notifications.readAt),
      ),
    );
  revalidatePath("/notifications");
}
