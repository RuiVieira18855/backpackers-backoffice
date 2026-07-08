import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  appAccess,
  auditLog,
  notifications,
  profiles,
  timeEntries,
} from "@/lib/db/schema";
import { requireProfile } from "@/lib/dal";

/**
 * GDPR data export — anyone signed in can request a dump of every row we
 * store about them. Returns a JSON attachment. Does NOT include entities
 * scoped by pillar (contacts, events, etc.) as those are group data, not
 * personal data; the user's role/skills/audit trail are theirs though.
 *
 * File name includes the user id + ISO date; body is pretty-printed.
 */
export async function GET() {
  const profile = await requireProfile();

  const [
    profileRow,
    entitlements,
    notifs,
    hoursLogged,
    auditActed,
    auditAboutMe,
  ] = await Promise.all([
    db
      .select()
      .from(profiles)
      .where(eq(profiles.id, profile.id))
      .limit(1)
      .catch(() => []),
    db
      .select()
      .from(appAccess)
      .where(eq(appAccess.userId, profile.id))
      .catch(() => []),
    db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, profile.id))
      .orderBy(desc(notifications.createdAt))
      .catch(() => []),
    db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.userId, profile.id))
      .orderBy(desc(timeEntries.date))
      .catch(() => []),
    db
      .select()
      .from(auditLog)
      .where(eq(auditLog.userId, profile.id))
      .orderBy(desc(auditLog.createdAt))
      .limit(2000)
      .catch(() => []),
    db
      .select()
      .from(auditLog)
      .where(eq(auditLog.entityId, profile.id))
      .orderBy(desc(auditLog.createdAt))
      .limit(2000)
      .catch(() => []),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    user_id: profile.id,
    profile: profileRow[0] ?? null,
    app_access: entitlements,
    notifications: notifs,
    time_entries: hoursLogged,
    audit_log_actions_by_me: auditActed,
    audit_log_actions_about_me: auditAboutMe,
    disclaimer:
      "This export contains personal data stored about you in the Backpackers backoffice. Group data (contacts, events, projects, transactions) is NOT included as it belongs to the organisation.",
  };

  const body = JSON.stringify(payload, null, 2);
  const filename = `backpackers-export-${profile.id}-${new Date()
    .toISOString()
    .slice(0, 10)}.json`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
