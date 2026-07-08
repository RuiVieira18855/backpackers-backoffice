import { NextResponse, type NextRequest } from "next/server";
import { requireProfile } from "@/lib/dal";
import {
  exchangeGoogleCode,
  fetchGoogleUserInfo,
  GOOGLE_SCOPES,
} from "@/lib/oauth/google";
import { upsertConnection } from "@/lib/oauth/store";

/**
 * Google OAuth callback. Exchange the auth code for tokens, look up the
 * Google email, and upsert the connection tied to the current user.
 *
 * Redirects to /settings on success or /settings?oauth_error=... on failure.
 */
export async function GET(req: NextRequest) {
  const profile = await requireProfile();
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const origin = url.origin;

  if (error) {
    return NextResponse.redirect(`${origin}/settings?oauth_error=${error}`);
  }
  if (!code || state !== profile.id) {
    return NextResponse.redirect(`${origin}/settings?oauth_error=invalid_state`);
  }

  try {
    const tokens = await exchangeGoogleCode(code);
    const userInfo = await fetchGoogleUserInfo(tokens.access_token);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await upsertConnection({
      userId: profile.id,
      provider: "google",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresAt,
      scope: tokens.scope ?? GOOGLE_SCOPES.join(" "),
      externalEmail: userInfo.email ?? null,
    });
  } catch (err) {
    console.error("[oauth/google/callback] failed:", err);
    return NextResponse.redirect(`${origin}/settings?oauth_error=exchange_failed`);
  }
  return NextResponse.redirect(`${origin}/settings?oauth_success=google`);
}
