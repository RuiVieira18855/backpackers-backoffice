"use client";

import { useState, useRef, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  /** Form field name; rendered as a hidden input with JSON-encoded array */
  name: string;
  defaultValue?: string[];
  placeholder?: string;
  className?: string;
  id?: string;
};

/**
 * Chip-style multi-value input. Hidden input ships a JSON array string so
 * server actions can parse with JSON.parse(formData.get(name) as string).
 */
export function TagsInput({
  name,
  defaultValue = [],
  placeholder,
  className,
  id,
}: Props) {
  const [tags, setTags] = useState<string[]>(defaultValue);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function addTag(raw: string) {
    const value = raw.trim();
    if (!value) return;
    if (tags.includes(value)) {
      setDraft("");
      return;
    }
    setTags([...tags, value]);
    setDraft("");
  }

  function removeTag(t: string) {
    setTags(tags.filter((x) => x !== t));
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === "Backspace" && !draft && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 min-h-9 text-sm",
        className,
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 rounded-md bg-accent/40 px-1.5 py-0.5 text-xs text-foreground"
        >
          {t}
          <button
            type="button"
            aria-label={`Remover ${t}`}
            onClick={(e) => {
              e.stopPropagation();
              removeTag(t);
            }}
            className="hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => addTag(draft)}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[100px] bg-transparent outline-none border-0 text-sm py-0.5"
      />
      {/* Single hidden field encoding tags as JSON array */}
      <input type="hidden" name={name} value={JSON.stringify(tags)} />
    </div>
  );
}
