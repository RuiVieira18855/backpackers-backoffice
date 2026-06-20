"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp, type SignupState } from "./actions";

const initialState: SignupState = {};

export function SignupForm() {
  const t = useTranslations("auth");
  const [state, formAction, pending] = useActionState(signUp, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="full_name">{t("fullName")}</Label>
        <Input
          id="full_name"
          name="full_name"
          type="text"
          autoComplete="name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{t("password")}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
        <p className="text-xs text-muted-foreground">{t("passwordHint")}</p>
      </div>
      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="text-sm text-foreground bg-accent/40 border border-accent rounded-md p-3">
          {state.success}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t("signingUp") : t("signUp")}
      </Button>
      <p className="text-sm text-muted-foreground text-center">
        {t("haveAccount")}{" "}
        <Link
          href="/login"
          className="underline underline-offset-4 hover:text-foreground"
        >
          {t("enterLink")}
        </Link>
      </p>
    </form>
  );
}
