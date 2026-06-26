import "server-only";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { db } from "./db";
import { notifications } from "./db/schema";

export type NotificationKind =
  | "task_assigned"
  | "task_due_soon"
  | "event_finance"
  | "event_doc"
  | "project_finance"
  | "project_doc"
  | "mention"
  | "system";

export type CreateNotificationParams = {
  /** Recipient. Required. */
  userId: string;
  kind: NotificationKind;
  title: string;
  body?: string | null;
  /** Optional in-app path (e.g. /ops/tasks/abc). Must start with "/". */
  link?: string | null;
  /** Who triggered this (optional, useful for showing "X added Y"). */
  actorId?: string | null;
  pillarId?: string | null;
};

/**
 * Insert a single notification. Use from server actions after a successful
 * mutation. Wrapped in try/catch by callers so a failure doesn't block the
 * primary action.
 *
 * No-op if userId === actorId — we don't want to ping someone about their
 * own action.
 */
export async function createNotification(
  params: CreateNotificationParams,
): Promise<void> {
  if (!params.userId) return;
  if (params.actorId && params.actorId === params.userId) return;

  const link =
    params.link && params.link.startsWith("/") ? params.link : null;

  await db.insert(notifications).values({
    userId: params.userId,
    kind: params.kind,
    title: params.title,
    body: params.body ?? null,
    link,
    actorId: params.actorId ?? null,
    pillarId: params.pillarId ?? null,
  });
}

/**
 * Fan-out helper for notifying multiple recipients. Deduplicates the list
 * and skips the actor.
 */
export async function createNotifications(
  userIds: Array<string | null | undefined>,
  shared: Omit<CreateNotificationParams, "userId">,
): Promise<void> {
  const unique = Array.from(
    new Set(
      userIds.filter((u): u is string => Boolean(u) && u !== shared.actorId),
    ),
  );
  if (unique.length === 0) return;

  const link =
    shared.link && shared.link.startsWith("/") ? shared.link : null;

  await db.insert(notifications).values(
    unique.map((userId) => ({
      userId,
      kind: shared.kind,
      title: shared.title,
      body: shared.body ?? null,
      link,
      actorId: shared.actorId ?? null,
      pillarId: shared.pillarId ?? null,
    })),
  );
}

/** Count unread notifications for a user. Cheap — used by the header bell. */
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const [row] = await db
      .select({ value: count() })
      .from(notifications)
      .where(
        and(eq(notifications.userId, userId), isNull(notifications.readAt)),
      );
    return row?.value ?? 0;
  } catch {
    return 0;
  }
}

/** Recent notifications for the bell dropdown / notifications page. */
export async function getRecentNotifications(userId: string, limit = 50) {
  try {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  } catch {
    return [];
  }
}
