import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/dal";
import { buildGoogleAuthUrl, isGoogleConfigured } from "@/lib/oauth/google";

/**
 * Kick off the Google OAuth flow. Redirects the user to Google's consent
 * screen with state = current user id (used to bind the callback back to
 * the right profile). Requires the caller to be authenticated in the
 * backoffice — customers can't drive OAuth flows.
 */
export async function GET() {
  const profile = await requireProfile();
  if (!isGoogleConfigured()) {
    return NextResponse.json(
      {
        error:
          "Google OAuth not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI env vars.",
      },
      { status: 501 },
    );
  }
  const url = buildGoogleAuthUrl(profile.id);
  return NextResponse.redirect(url);
}
