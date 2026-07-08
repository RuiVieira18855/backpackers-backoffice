"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendResendTest } from "./actions";

export function ResendTestForm({ defaultTo }: { defaultTo: string }) {
  const t = useTranslations("admin.resendTest");
  const [pending, startTransition] = useTransition();
  const [to, setTo] = useState(defaultTo);
  const [result, setResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="to">{t("to")}</Label>
        <Input
          id="to"
          type="email"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="you@example.com"
        />
      </div>

      <Button
        type="button"
        disabled={pending || !to}
        onClick={() =>
          startTransition(async () => {
            const r = await sendResendTest(to);
            setResult({ ok: r.ok, message: r.message });
          })
        }
      >
        <Send className="mr-2 h-3.5 w-3.5" />
        {pending ? t("sending") : t("sendCta")}
      </Button>

      {result && (
        <p
          className={
            "text-sm " +
            (result.ok ? "text-accent-foreground" : "text-destructive")
          }
          role="alert"
        >
          {result.message}
        </p>
      )}
    </div>
  );
}
