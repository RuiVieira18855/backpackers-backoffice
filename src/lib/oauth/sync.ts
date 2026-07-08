import "server-only";
import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, oauthConnections } from "@/lib/db/schema";
import {
  getValidGoogleToken,
  listGoogleEvents,
  type GoogleCalendarEvent,
} from "./google";
import {
  getValidMicrosoftToken,
  listMicrosoftEvents,
  type MicrosoftCalendarEvent,
} from "./microsoft";
import { setSyncMetadata, type OAuthProvider } from "./store";

export type SyncResult = {
  inserted: number;
  updated: number;
  skipped: number;
  error?: string;
};

/**
 * Pull events from an external calendar and upsert them into ours.
 *
 * Requirements:
 * - user must have a connection for that provider
 * - a default pillar must be set on the connection (so we know where to
 *   land new events; the events.pillarId column is NOT NULL)
 *
 * Window: from now - 7 days to now + 90 days. Upsert key: external event id.
 * Sync is one-way (external → us). Local edits win — we only overwrite the
 * name/description/location/start/end fields if they were previously null.
 *
 * NOTE: this is best-effort. Google's "cancelled" events are skipped;
 * Microsoft's isCancelled events are skipped.
 */
export async function pullExternalEvents(
  userId: string,
  provider: OAuthProvider,
): Promise<SyncResult> {
  const [conn] = await db
    .select()
    .from(oauthConnections)
    .where(
      and(
        eq(oauthConnections.userId, userId),
        eq(oauthConnections.provider, provider),
      ),
    )
    .limit(1);
  if (!conn) return { inserted: 0, updated: 0, skipped: 0, error: "no connection" };
  if (!conn.defaultPillarId) {
    return {
      inserted: 0,
      updated: 0,
      skipped: 0,
      error: "no default_pillar_id set on connection",
    };
  }

  const now = new Date();
  const from = new Date(now.getTime() - 7 * 86_400_000);
  const to = new Date(now.getTime() + 90 * 86_400_000);
  const timeMin = from.toISOString();
  const timeMax = to.toISOString();

  let result: SyncResult = { inserted: 0, updated: 0, skipped: 0 };

  try {
    if (provider === "google") {
      const token = await getValidGoogleToken(userId);
      if (!token) throw new Error("no valid access token");
      const rows = await listGoogleEvents(token, timeMin, timeMax);
      result = await upsertGoogleEvents(userId, conn.defaultPillarId, rows);
    } else {
      const token = await getValidMicrosoftToken(userId);
      if (!token) throw new Error("no valid access token");
      const rows = await listMicrosoftEvents(token, timeMin, timeMax);
      result = await upsertMicrosoftEvents(userId, conn.defaultPillarId, rows);
    }
    await setSyncMetadata(userId, provider, { lastSyncedAt: new Date() });
    return result;
  } catch (err) {
    console.error(`[sync/${provider}] failed:`, err);
    return {
      inserted: 0,
      updated: 0,
      skipped: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function parseDateOrDateTime(x: {
  dateTime?: string;
  date?: string;
} | undefined): Date | null {
  if (!x) return null;
  if (x.dateTime) return new Date(x.dateTime);
  if (x.date) return new Date(`${x.date}T00:00:00Z`);
  return null;
}

async function upsertGoogleEvents(
  ownerId: string,
  pillarId: string,
  items: GoogleCalendarEvent[],
): Promise<SyncResult> {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const ev of items) {
    if (ev.status === "cancelled") {
      skipped++;
      continue;
    }
    const startAt = parseDateOrDateTime(ev.start);
    const endAt = parseDateOrDateTime(ev.end);
    if (!startAt) {
      skipped++;
      continue;
    }

    const [existing] = await db
      .select()
      .from(events)
      .where(
        and(
          eq(events.googleEventId, ev.id),
          isNotNull(events.googleEventId),
        ),
      )
      .limit(1);

    if (existing) {
      // Only fill in null fields — respect local edits.
      const patch: Partial<typeof events.$inferInsert> = {
        lastSyncedAt: new Date(),
      };
      if (!existing.name && ev.summary) patch.name = ev.summary;
      if (!existing.description && ev.description) patch.description = ev.description;
      if (!existing.location && ev.location) patch.location = ev.location;
      if (!existing.startAt) patch.startAt = startAt;
      if (!existing.endAt && endAt) patch.endAt = endAt;
      await db.update(events).set(patch).where(eq(events.id, existing.id));
      updated++;
    } else {
      await db.insert(events).values({
        name: ev.summary || "(sem título)",
        description: ev.description ?? null,
        location: ev.location ?? null,
        startAt,
        endAt,
        pillarId,
        ownerId,
        googleEventId: ev.id,
        lastSyncedAt: new Date(),
      });
      inserted++;
    }
  }

  return { inserted, updated, skipped };
}

async function upsertMicrosoftEvents(
  ownerId: string,
  pillarId: string,
  items: MicrosoftCalendarEvent[],
): Promise<SyncResult> {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const ev of items) {
    if (ev.isCancelled) {
      skipped++;
      continue;
    }
    const startAt = ev.start?.dateTime
      ? new Date(`${ev.start.dateTime}Z`)
      : null;
    const endAt = ev.end?.dateTime ? new Date(`${ev.end.dateTime}Z`) : null;
    if (!startAt) {
      skipped++;
      continue;
    }

    const [existing] = await db
      .select()
      .from(events)
      .where(
        and(
          eq(events.microsoftEventId, ev.id),
          isNotNull(events.microsoftEventId),
        ),
      )
      .limit(1);

    if (existing) {
      const patch: Partial<typeof events.$inferInsert> = {
        lastSyncedAt: new Date(),
      };
      if (!existing.name && ev.subject) patch.name = ev.subject;
      if (!existing.description && ev.bodyPreview) patch.description = ev.bodyPreview;
      if (!existing.location && ev.location?.displayName)
        patch.location = ev.location.displayName;
      if (!existing.startAt) patch.startAt = startAt;
      if (!existing.endAt && endAt) patch.endAt = endAt;
      await db.update(events).set(patch).where(eq(events.id, existing.id));
      updated++;
    } else {
      await db.insert(events).values({
        name: ev.subject || "(sem título)",
        description: ev.bodyPreview ?? null,
        location: ev.location?.displayName ?? null,
        startAt,
        endAt,
        pillarId,
        ownerId,
        microsoftEventId: ev.id,
        lastSyncedAt: new Date(),
      });
      inserted++;
    }
  }

  return { inserted, updated, skipped };
}
