import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/dal";
import {
  buildMicrosoftAuthUrl,
  isMicrosoftConfigured,
} from "@/lib/oauth/microsoft";

export async function GET() {
  const profile = await requireProfile();
  if (!isMicrosoftConfigured()) {
    return NextResponse.json(
      {
        error:
          "Microsoft OAuth not configured. Set MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_REDIRECT_URI env vars.",
      },
      { status: 501 },
    );
  }
  const url = buildMicrosoftAuthUrl(profile.id);
  return NextResponse.redirect(url);
}
