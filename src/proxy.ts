import type { NextRequest } from "next/server";
import { updateSupabaseSession } from "@/lib/supabase/proxy-helper";

export async function proxy(request: NextRequest) {
  return updateSupabaseSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - api routes (handle auth internally)
     * - _next/static, _next/image
     * - favicon, robots, sitemap, manifest
     * - asset files (png/svg/jpg/jpeg/gif/webp/ico)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:png|svg|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
