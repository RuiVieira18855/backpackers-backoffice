"use client";

import { useState, useTransition } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

export type AiCardAction = () => Promise<
  | { ok: true; text: string }
  | { ok: false; error: string; code?: string }
>;

export type AiCardProps = {
  title: string;
  description?: string;
  cta: string;
  regenerateCta?: string;
  action: AiCardAction;
  disclaimer?: string;
  notConfiguredMessage?: string;
};

export function AiCard({
  title,
  description,
  cta,
  regenerateCta,
  action,
  disclaimer,
  notConfiguredMessage,
}: AiCardProps) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);

  function run() {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        if (result.code === "not_configured") {
          setNotConfigured(true);
          return;
        }
        toast.error(result.error);
        return;
      }
      setText(result.text);
    });
  }

  return (
    <Card className="border-accent/40 bg-accent/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-accent" />
          {title}
        </CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {notConfigured ? (
          <p className="text-sm text-muted-foreground italic">
            {notConfiguredMessage ??
              "AI copilot is not configured. Set ANTHROPIC_API_KEY to enable."}
          </p>
        ) : text ? (
          <>
            <div
              role="region"
              aria-live="polite"
              className="whitespace-pre-wrap text-sm text-foreground leading-relaxed"
            >
              {text}
            </div>
            <div className="flex items-center justify-between gap-2 pt-2">
              {disclaimer && (
                <p className="text-xs text-muted-foreground italic">
                  {disclaimer}
                </p>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={run}
                disabled={pending}
              >
                <RefreshCw
                  className={`mr-2 h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`}
                />
                {regenerateCta ?? "Regenerate"}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={run} disabled={pending}>
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              {pending ? `${cta}…` : cta}
            </Button>
            {disclaimer && (
              <p className="text-xs text-muted-foreground italic">
                {disclaimer}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
