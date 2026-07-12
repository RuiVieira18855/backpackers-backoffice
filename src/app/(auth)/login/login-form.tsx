"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, type LoginState } from "./actions";

const initialState: LoginState = {};
const STORAGE_KEY = "outpost.rememberedEmail";

export function LoginForm() {
  const t = useTranslations("auth");
  const [state, formAction, pending] = useActionState(signIn, initialState);
  const [email, setEmail] = useState("");
  const [remember, setRemember] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setEmail(saved);
        setRemember(true);
      }
    } catch {
      // localStorage unavailable — silently ignore
    }
  }, []);

  function onSubmit() {
    try {
      if (remember && email) {
        window.localStorage.setItem(STORAGE_KEY, email);
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }

  return (
    <form action={formAction} onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{t("password")}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          className="h-4 w-4 rounded border-input"
        />
        {t("rememberMe")}
      </label>
      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t("signingIn") : t("signIn")}
      </Button>
      <p className="text-sm text-muted-foreground text-center">
        {t("noAccount")}{" "}
        <Link
          href="/signup"
          className="underline underline-offset-4 hover:text-foreground"
        >
          {t("createAccountLink")}
        </Link>
      </p>
    </form>
  );
}
