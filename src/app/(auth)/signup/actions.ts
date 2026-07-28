"use server";

export type SignupState = {
  error?: string;
  success?: string;
};

export async function signUp(
  _prev: SignupState | undefined,
  _formData: FormData,
): Promise<SignupState> {
  // SECURITY: the Outpost is invite-only. Public self-signup was removed because
  // it could mint internal backoffice accounts (and, on the shared Supabase
  // project, let a customer self-promote to internal). Team members are added
  // by an admin via /admin/users/new. This action is intentionally disabled;
  // the handle_new_user trigger is the real backstop (all signups → customer).
  return { error: "Signup is invite-only. Ask an administrator for access." };
}
