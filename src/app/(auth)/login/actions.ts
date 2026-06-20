"use server";

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LoginState = {
  error?: string;
};

export async function signIn(
  _prev: LoginState | undefined,
  formData: FormData,
): Promise<LoginState> {
  const t = await getTranslations("auth.errors");

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: t("emailPasswordRequired") };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Supabase error messages are in English by default. Pass through for now;
    // when EN/ES locales arrive we can map error codes -> localised strings.
    return { error: error.message };
  }

  redirect("/dashboard");
}
