"use server";

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SignupState = {
  error?: string;
  success?: string;
};

export async function signUp(
  _prev: SignupState | undefined,
  formData: FormData,
): Promise<SignupState> {
  const tErrors = await getTranslations("auth.errors");
  const tAuth = await getTranslations("auth");

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();

  if (!email || !password) {
    return { error: tErrors("emailPasswordRequired") };
  }
  if (password.length < 8) {
    return { error: tErrors("passwordTooShort") };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName || null },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.session) {
    redirect("/dashboard");
  }

  return { success: tAuth("signupConfirmation") };
}
