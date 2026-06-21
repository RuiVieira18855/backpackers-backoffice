"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  ClipboardList,
  FileText,
  ListTodo,
  Search,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { searchAll } from "@/app/(protected)/actions";
import type { SearchHit } from "@/lib/search";

const KIND_ICON = {
  contact: Users,
  event: Calendar,
  project: ClipboardList,
  task: ListTodo,
  document: FileText,
} as const;

const KIND_HREF: Record<SearchHit["kind"], (id: string) => string> = {
  contact: (id) => `/crm/contacts/${id}`,
  event: (id) => `/ops/events/${id}`,
  project: (id) => `/ops/projects/${id}`,
  task: (id) => `/ops/tasks/${id}`,
  document: (id) => `/docs/${id}`,
};

export function GlobalSearch() {
  const t = useTranslations("search");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [pending, startTransition] = useTransition();

  // Cmd+K (or Ctrl+K) to open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Debounced search on query change
  useEffect(() => {
    if (query.trim().length < 2) {
      setHits([]);
      return;
    }
    const handle = setTimeout(() => {
      startTransition(async () => {
        const results = await searchAll(query);
        setHits(results);
      });
    }, 180);
    return () => clearTimeout(handle);
  }, [query]);

  function go(hit: SearchHit) {
    setOpen(false);
    setQuery("");
    setHits([]);
    router.push(KIND_HREF[hit.kind](hit.id));
  }

  const grouped = hits.reduce<Record<SearchHit["kind"], SearchHit[]>>(
    (acc, h) => {
      (acc[h.kind] ||= []).push(h);
      return acc;
    },
    {} as never,
  );

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="hidden sm:inline-flex gap-2 text-muted-foreground"
      >
        <Search className="h-3.5 w-3.5" />
        <span>{t("placeholder")}</span>
        <kbd className="ml-2 hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
          ⌘K
        </kbd>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="sm:hidden"
        aria-label={t("placeholder")}
      >
        <Search className="h-4 w-4" />
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title={t("placeholder")}
        description={t("description")}
      >
        <CommandInput
          placeholder={t("placeholder")}
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {!pending && query.length >= 2 && hits.length === 0 && (
            <CommandEmpty>{t("noResults")}</CommandEmpty>
          )}
          {query.length < 2 && (
            <CommandEmpty>{t("typeToStart")}</CommandEmpty>
          )}
          {pending && query.length >= 2 && (
            <CommandEmpty>{t("searching")}</CommandEmpty>
          )}

          {(["contact", "event", "project", "task", "document"] as const).map(
            (kind) => {
              const items = grouped[kind];
              if (!items || items.length === 0) return null;
              const Icon = KIND_ICON[kind];
              return (
                <CommandGroup key={kind} heading={t(`groups.${kind}`)}>
                  {items.map((hit) => (
                    <CommandItem
                      key={hit.id}
                      value={`${hit.kind}-${hit.id}-${hit.label}`}
                      onSelect={() => go(hit)}
                    >
                      <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                      <div className="flex flex-col min-w-0">
                        <span className="truncate">{hit.label}</span>
                        {hit.sublabel && (
                          <span className="text-xs text-muted-foreground truncate">
                            {hit.sublabel}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                  <CommandSeparator />
                </CommandGroup>
              );
            },
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
