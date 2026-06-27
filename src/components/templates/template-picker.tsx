"use client";

import { useState } from "react";
import { ChevronDown, FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import type { TemplateOption } from "@/lib/templates";

type Props = {
  templates: TemplateOption[];
  /** id of the textarea to inject into. */
  targetId: string;
  /** how to inject: replace the field content or append at cursor. */
  mode?: "replace" | "append";
};

/**
 * Renders a small "Insert template" dropdown above a textarea. On click,
 * either replaces the textarea value or appends the template body at the
 * end (preserving existing content with a blank line separator).
 *
 * Renders nothing when there are no templates available for the scope, so
 * it can be dropped into any form without conditional logic upstream.
 */
export function TemplatePicker({ templates, targetId, mode = "append" }: Props) {
  const t = useTranslations("templates.picker");
  const [open, setOpen] = useState(false);

  if (templates.length === 0) return null;

  const insert = (body: string) => {
    const el = document.getElementById(targetId) as
      | HTMLTextAreaElement
      | HTMLInputElement
      | null;
    if (!el) return;
    if (mode === "replace" || !el.value.trim()) {
      el.value = body;
    } else {
      el.value = `${el.value.trimEnd()}\n\n${body}`;
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.focus();
    setOpen(false);
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded border border-border hover:border-accent"
      >
        <FileText className="h-3 w-3" />
        {t("button")}
        <ChevronDown className="h-3 w-3 opacity-70" />
      </button>
      {open && (
        <>
          {/* click-outside guard */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 top-full mt-1 z-20 min-w-56 max-w-sm rounded-md border border-border bg-card shadow-md">
            <ul className="py-1 max-h-72 overflow-auto">
              {templates.map((tpl) => (
                <li key={tpl.id}>
                  <button
                    type="button"
                    onClick={() => insert(tpl.body)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                  >
                    <div className="font-medium text-foreground truncate">
                      {tpl.name}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {tpl.body.slice(0, 80)}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
            <div className="border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground italic">
              {t("hint")}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
