"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Merge, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mergeContacts } from "@/app/(protected)/crm/dedup/actions";

type Option = { id: string; label: string };

type Props = {
  keeperId: string;
  others: Option[];
};

export function ManualMergeForm({ keeperId, others }: Props) {
  const t = useTranslations("crm.mergeManual");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loserId, setLoserId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return others.slice(0, 20);
    return others
      .filter((o) => o.label.toLowerCase().includes(q))
      .slice(0, 20);
  }, [others, query]);

  const handleMerge = () => {
    if (!loserId) return;
    const label = others.find((o) => o.id === loserId)?.label ?? "?";
    if (!confirm(t("confirm", { name: label }))) return;
    startTransition(async () => {
      const res = await mergeContacts(keeperId, [loserId]);
      if (res.ok) {
        router.push(`/crm/contacts/${keeperId}`);
      } else {
        alert(res.error ?? "Error");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="search">{t("searchLabel")}</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="pl-9"
          />
        </div>
      </div>

      <div className="rounded-md border border-border overflow-hidden">
        {filtered.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground italic text-center">
            {t("noMatches")}
          </p>
        ) : (
          <ul className="divide-y divide-border max-h-80 overflow-auto">
            {filtered.map((o) => (
              <li key={o.id}>
                <label className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-muted/40 cursor-pointer">
                  <input
                    type="radio"
                    name="loser"
                    value={o.id}
                    checked={loserId === o.id}
                    onChange={() => setLoserId(o.id)}
                    className="h-4 w-4"
                  />
                  <span className="text-foreground truncate">{o.label}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-muted-foreground">{t("hint")}</p>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          onClick={handleMerge}
          disabled={pending || !loserId}
        >
          <Merge className="mr-2 h-3.5 w-3.5" />
          {pending ? t("merging") : t("mergeCta")}
        </Button>
        <Button asChild variant="ghost">
          <Link href={`/crm/contacts/${keeperId}`}>{t("cancel")}</Link>
        </Button>
      </div>
    </div>
  );
}
