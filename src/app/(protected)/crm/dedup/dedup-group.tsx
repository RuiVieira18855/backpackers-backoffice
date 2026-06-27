"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Merge, Phone } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { mergeContacts } from "./actions";

type Contact = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  pillarName: string;
  createdAt: string;
};

type Props = {
  matchKey: string;
  matchKind: "email" | "phone";
  contacts: Contact[];
};

export function DedupGroup({ matchKey, matchKind, contacts }: Props) {
  const t = useTranslations("crm.dedup");
  const router = useRouter();
  // Default keeper = oldest (lowest createdAt). Users can change.
  const oldest = [...contacts].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  )[0];
  const [keeperId, setKeeperId] = useState<string>(oldest.id);
  const [pending, startTransition] = useTransition();

  const handleMerge = () => {
    const losers = contacts.filter((c) => c.id !== keeperId).map((c) => c.id);
    if (losers.length === 0) return;
    if (!confirm(t("mergeConfirm", { count: contacts.length }))) return;
    startTransition(async () => {
      const res = await mergeContacts(keeperId, losers);
      if (res.ok) {
        router.refresh();
      } else {
        alert(res.error ?? "Error");
      }
    });
  };

  const Icon = matchKind === "email" ? Mail : Phone;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium text-foreground truncate">
              {t("matchOn", { kind: t(`kind.${matchKind}`), key: matchKey })}
            </span>
            <span className="text-xs text-muted-foreground shrink-0">
              · {t("groupSize", { count: contacts.length })}
            </span>
          </div>
          <Button
            size="sm"
            onClick={handleMerge}
            disabled={pending}
            className="shrink-0"
          >
            <Merge className="mr-2 h-3.5 w-3.5" />
            {pending
              ? t("merging")
              : t("mergeInto", { count: contacts.length - 1 })}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-border">
          {contacts.map((c) => {
            const isKeeper = c.id === keeperId;
            return (
              <li
                key={c.id}
                className={`px-6 py-3 text-sm ${isKeeper ? "bg-accent/10" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name={`keeper-${matchKey}-${matchKind}`}
                    checked={isKeeper}
                    onChange={() => setKeeperId(c.id)}
                    className="mt-1 h-4 w-4"
                    aria-label={t("setKeeper")}
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/crm/contacts/${c.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {c.fullName}
                    </Link>
                    {isKeeper && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-accent/50 px-2 py-0.5 text-[10px] uppercase tracking-wider">
                        {t("keeper")}
                      </span>
                    )}
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {c.company && <span>{c.company} · </span>}
                      {c.pillarName}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {c.email && <span>{c.email}</span>}
                      {c.email && c.phone && " · "}
                      {c.phone && <span>{c.phone}</span>}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
