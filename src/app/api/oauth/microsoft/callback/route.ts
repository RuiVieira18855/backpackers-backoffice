import { NextResponse, type NextRequest } from "next/server";
import { requireProfile } from "@/lib/dal";
import {
  exchangeMicrosoftCode,
  fetchMicrosoftUserInfo,
  MS_SCOPES,
} from "@/lib/oauth/microsoft";
import { upsertConnection } from "@/lib/oauth/store";

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
    const tokens = await exchangeMicrosoftCode(code);
    const userInfo = await fetchMicrosoftUserInfo(tokens.access_token);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await upsertConnection({
      userId: profile.id,
      provider: "microsoft",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresAt,
      scope: tokens.scope ?? MS_SCOPES.join(" "),
      externalEmail: userInfo.email ?? null,
    });
  } catch (err) {
    console.error("[oauth/microsoft/callback] failed:", err);
    return NextResponse.redirect(`${origin}/settings?oauth_error=exchange_failed`);
  }
  return NextResponse.redirect(`${origin}/settings?oauth_success=microsoft`);
}
