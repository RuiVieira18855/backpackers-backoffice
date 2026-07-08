import "server-only";
import { getConnection, updateTokens } from "./store";

/**
 * Google Calendar / OAuth 2.0 helpers.
 *
 * Env vars required (Vercel):
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *   GOOGLE_REDIRECT_URI  (e.g. https://your-backoffice.vercel.app/api/oauth/google/callback)
 *
 * Scopes requested: read-only calendar events (pull sync only for MVP).
 */

const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO = "https://openidconnect.googleapis.com/v1/userinfo";
const GOOGLE_CALENDAR_EVENTS =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";

export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  // Write scope so we can push local events to the user's calendar.
  // Users who connected before this change need to re-connect to grant it.
  "https://www.googleapis.com/auth/calendar.events",
];

export function googleClientEnv() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    redirectUri: process.env.GOOGLE_REDIRECT_URI ?? "",
  };
}

export function isGoogleConfigured(): boolean {
  const env = googleClientEnv();
  return Boolean(env.clientId && env.clientSecret && env.redirectUri);
}

export function buildGoogleAuthUrl(state: string): string {
  const env = googleClientEnv();
  const params = new URLSearchParams({
    client_id: env.clientId,
    redirect_uri: env.redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${GOOGLE_AUTH}?${params.toString()}`;
}

export type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

export async function exchangeGoogleCode(code: string): Promise<GoogleTokenResponse> {
  const env = googleClientEnv();
  const res = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.clientId,
      client_secret: env.clientSecret,
      redirect_uri: env.redirectUri,
      grant_type: "authorization_code",
    }).toString(),
  });
  if (!res.ok) {
    throw new Error(`Google token exchange failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as GoogleTokenResponse;
}

export async function refreshGoogleToken(refreshToken: string): Promise<GoogleTokenResponse> {
  const env = googleClientEnv();
  const res = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.clientId,
      client_secret: env.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  });
  if (!res.ok) {
    throw new Error(`Google refresh failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as GoogleTokenResponse;
}

export async function fetchGoogleUserInfo(accessToken: string): Promise<{
  email?: string;
  name?: string;
}> {
  const res = await fetch(GOOGLE_USERINFO, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return {};
  return (await res.json()) as { email?: string; name?: string };
}

/** Returns a valid access token, refreshing if expired. */
export async function getValidGoogleToken(userId: string): Promise<string | null> {
  const conn = await getConnection(userId, "google");
  if (!conn) return null;
  const now = Date.now();
  const isExpired = conn.expiresAt ? conn.expiresAt.getTime() < now + 60_000 : true;
  if (!isExpired) return conn.accessToken;
  if (!conn.refreshToken) return conn.accessToken; // no refresh — fallback
  try {
    const refreshed = await refreshGoogleToken(conn.refreshToken);
    const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000);
    await updateTokens(
      userId,
      "google",
      refreshed.access_token,
      expiresAt,
      refreshed.refresh_token ?? null,
    );
    return refreshed.access_token;
  } catch (err) {
    console.error("[google] refresh failed:", err);
    return null;
  }
}

export type GoogleCalendarEvent = {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  status?: string;
};

/**
 * Pull events from the primary Google Calendar in a time window.
 * `timeMin` / `timeMax` are ISO strings.
 */
export async function listGoogleEvents(
  accessToken: string,
  timeMin: string,
  timeMax: string,
): Promise<GoogleCalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });
  const res = await fetch(`${GOOGLE_CALENDAR_EVENTS}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Google list events failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { items?: GoogleCalendarEvent[] };
  return data.items ?? [];
}

// ---------- Push helpers ----------

type LocalEventPayload = {
  name: string;
  description: string | null;
  location: string | null;
  startAt: Date;
  endAt: Date | null;
};

function toGoogleEventBody(ev: LocalEventPayload) {
  const start = ev.startAt.toISOString();
  const end = (ev.endAt ?? new Date(ev.startAt.getTime() + 3600_000)).toISOString();
  return {
    summary: ev.name,
    description: ev.description ?? undefined,
    location: ev.location ?? undefined,
    start: { dateTime: start },
    end: { dateTime: end },
  };
}

/** Create an event in the primary Google calendar. Returns the new id. */
export async function createGoogleEvent(
  accessToken: string,
  ev: LocalEventPayload,
): Promise<string> {
  const res = await fetch(GOOGLE_CALENDAR_EVENTS, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(toGoogleEventBody(ev)),
  });
  if (!res.ok) {
    throw new Error(
      `Google create event failed: ${res.status} ${await res.text()}`,
    );
  }
  const data = (await res.json()) as { id: string };
  return data.id;
}

export async function patchGoogleEvent(
  accessToken: string,
  eventId: string,
  ev: LocalEventPayload,
): Promise<void> {
  const res = await fetch(`${GOOGLE_CALENDAR_EVENTS}/${encodeURIComponent(eventId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(toGoogleEventBody(ev)),
  });
  if (!res.ok) {
    throw new Error(
      `Google patch event failed: ${res.status} ${await res.text()}`,
    );
  }
}

export async function deleteGoogleEvent(
  accessToken: string,
  eventId: string,
): Promise<void> {
  const res = await fetch(
    `${GOOGLE_CALENDAR_EVENTS}/${encodeURIComponent(eventId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  // Google returns 410 (Gone) if already deleted — treat as OK.
  if (!res.ok && res.status !== 410 && res.status !== 404) {
    throw new Error(
      `Google delete event failed: ${res.status} ${await res.text()}`,
    );
  }
}
