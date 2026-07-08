import "server-only";
import { getConnection, updateTokens } from "./store";

/**
 * Microsoft Graph / OAuth 2.0 helpers.
 *
 * Env vars required (Vercel):
 *   MICROSOFT_CLIENT_ID
 *   MICROSOFT_CLIENT_SECRET
 *   MICROSOFT_REDIRECT_URI
 *   MICROSOFT_TENANT  (default "common" for multi-tenant; can be a tenant id)
 *
 * Scopes: Calendars.Read (pull sync only) + offline_access for refresh.
 */

const MS_AUTH_BASE = (tenant: string) =>
  `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`;
const MS_TOKEN = (tenant: string) =>
  `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
const MS_ME = "https://graph.microsoft.com/v1.0/me";
const MS_CALENDAR_EVENTS = "https://graph.microsoft.com/v1.0/me/calendarView";

export const MS_SCOPES = [
  "openid",
  "email",
  "profile",
  "offline_access",
  "Calendars.Read",
];

export function microsoftClientEnv() {
  return {
    clientId: process.env.MICROSOFT_CLIENT_ID ?? "",
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
    redirectUri: process.env.MICROSOFT_REDIRECT_URI ?? "",
    tenant: process.env.MICROSOFT_TENANT ?? "common",
  };
}

export function isMicrosoftConfigured(): boolean {
  const env = microsoftClientEnv();
  return Boolean(env.clientId && env.clientSecret && env.redirectUri);
}

export function buildMicrosoftAuthUrl(state: string): string {
  const env = microsoftClientEnv();
  const params = new URLSearchParams({
    client_id: env.clientId,
    response_type: "code",
    redirect_uri: env.redirectUri,
    response_mode: "query",
    scope: MS_SCOPES.join(" "),
    state,
  });
  return `${MS_AUTH_BASE(env.tenant)}?${params.toString()}`;
}

export type MicrosoftTokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

export async function exchangeMicrosoftCode(
  code: string,
): Promise<MicrosoftTokenResponse> {
  const env = microsoftClientEnv();
  const res = await fetch(MS_TOKEN(env.tenant), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.clientId,
      client_secret: env.clientSecret,
      code,
      redirect_uri: env.redirectUri,
      grant_type: "authorization_code",
      scope: MS_SCOPES.join(" "),
    }).toString(),
  });
  if (!res.ok) {
    throw new Error(
      `Microsoft token exchange failed: ${res.status} ${await res.text()}`,
    );
  }
  return (await res.json()) as MicrosoftTokenResponse;
}

export async function refreshMicrosoftToken(
  refreshToken: string,
): Promise<MicrosoftTokenResponse> {
  const env = microsoftClientEnv();
  const res = await fetch(MS_TOKEN(env.tenant), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.clientId,
      client_secret: env.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      scope: MS_SCOPES.join(" "),
    }).toString(),
  });
  if (!res.ok) {
    throw new Error(`Microsoft refresh failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as MicrosoftTokenResponse;
}

export async function fetchMicrosoftUserInfo(accessToken: string): Promise<{
  email?: string;
  name?: string;
}> {
  const res = await fetch(MS_ME, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return {};
  const j = (await res.json()) as {
    mail?: string;
    userPrincipalName?: string;
    displayName?: string;
  };
  return {
    email: j.mail ?? j.userPrincipalName,
    name: j.displayName,
  };
}

export async function getValidMicrosoftToken(
  userId: string,
): Promise<string | null> {
  const conn = await getConnection(userId, "microsoft");
  if (!conn) return null;
  const now = Date.now();
  const isExpired = conn.expiresAt ? conn.expiresAt.getTime() < now + 60_000 : true;
  if (!isExpired) return conn.accessToken;
  if (!conn.refreshToken) return conn.accessToken;
  try {
    const refreshed = await refreshMicrosoftToken(conn.refreshToken);
    const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000);
    await updateTokens(
      userId,
      "microsoft",
      refreshed.access_token,
      expiresAt,
      refreshed.refresh_token ?? null,
    );
    return refreshed.access_token;
  } catch (err) {
    console.error("[microsoft] refresh failed:", err);
    return null;
  }
}

export type MicrosoftCalendarEvent = {
  id: string;
  subject?: string;
  bodyPreview?: string;
  location?: { displayName?: string };
  start?: { dateTime: string; timeZone: string };
  end?: { dateTime: string; timeZone: string };
  isCancelled?: boolean;
};

export async function listMicrosoftEvents(
  accessToken: string,
  startISO: string,
  endISO: string,
): Promise<MicrosoftCalendarEvent[]> {
  const params = new URLSearchParams({
    startDateTime: startISO,
    endDateTime: endISO,
    $top: "250",
    $orderby: "start/dateTime",
  });
  const res = await fetch(`${MS_CALENDAR_EVENTS}?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Prefer: 'outlook.timezone="UTC"',
    },
  });
  if (!res.ok) {
    throw new Error(
      `Microsoft list events failed: ${res.status} ${await res.text()}`,
    );
  }
  const data = (await res.json()) as { value?: MicrosoftCalendarEvent[] };
  return data.value ?? [];
}
