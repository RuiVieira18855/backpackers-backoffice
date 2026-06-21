"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LOCALE_COOKIE } from "@/i18n/request";
import { isLocale } from "@/i18n/locales";
import { requireProfile } from "@/lib/dal";
import { globalSearch, type SearchHit } from "@/lib/search";

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function searchAll(query: string): Promise<SearchHit[]> {
  await requireProfile();
  return globalSearch(query);
}

/**
 * Persist locale preference in a long-lived cookie.
 * next-intl's request.ts reads from this cookie to pick the dictionary.
 */
export async function setLocale(locale: string) {
  if (!isLocale(locale)) return;
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: "lax",
  });
  // Trigger re-render with new locale
  revalidatePath("/", "layout");
}
