import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { sql } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { requireRole } from "@/lib/dal";
import { DedupGroup } from "./dedup-group";

type GroupRow = {
  matchKey: string; // normalised email or phone
  matchKind: "email" | "phone";
  contacts: Array<{
    id: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    pillarName: string;
    createdAt: string;
  }>;
};

/**
 * Build duplicate groups: contacts sharing the same email (case-insensitive)
 * or the same normalised phone (digits only, last 9). Each contact may belong
 * to at most one group; email matches take precedence over phone matches.
 */
async function findDuplicateGroups(): Promise<GroupRow[]> {
  const emailGroupsRaw = await db.execute<{
    match_key: string;
    ids: string[];
  }>(sql`
    SELECT lower(email) as match_key, array_agg(id) as ids
    FROM   public.contacts
    WHERE  email IS NOT NULL AND length(trim(email)) > 0
    GROUP  BY lower(email)
    HAVING count(*) > 1
    LIMIT  100
  `);

  const phoneGroupsRaw = await db.execute<{
    match_key: string;
    ids: string[];
  }>(sql`
    SELECT right(regexp_replace(phone, '[^0-9]', '', 'g'), 9) as match_key,
           array_agg(id) as ids
    FROM   public.contacts
    WHERE  phone IS NOT NULL
       AND length(regexp_replace(phone, '[^0-9]', '', 'g')) >= 7
    GROUP  BY right(regexp_replace(phone, '[^0-9]', '', 'g'), 9)
    HAVING count(*) > 1
    LIMIT  100
  `);

  // Collect all contact ids from groups (limit to manageable size).
  const allIds = new Set<string>();
  for (const g of emailGroupsRaw) for (const id of g.ids) allIds.add(id);
  for (const g of phoneGroupsRaw) for (const id of g.ids) allIds.add(id);
  if (allIds.size === 0) return [];

  const ids = Array.from(allIds);
  const detailsRaw = await db.execute<{
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    pillar_name: string;
    created_at: string;
  }>(sql`
    SELECT c.id,
           c.full_name,
           c.email,
           c.phone,
           c.company,
           p.name AS pillar_name,
           c.created_at::text
    FROM   public.contacts c
    LEFT   JOIN public.pillars p ON p.id = c.pillar_id
    WHERE  c.id = ANY (${sql.raw(`ARRAY[${ids.map((id) => `'${id}'`).join(",")}]::uuid[]`)})
  `);

  const byId = new Map(detailsRaw.map((r) => [r.id, r]));

  // Track which contacts already belong to a chosen group (email wins).
  const placed = new Set<string>();
  const groups: GroupRow[] = [];

  for (const g of emailGroupsRaw) {
    const members = g.ids
      .filter((id) => !placed.has(id))
      .map((id) => byId.get(id))
      .filter(Boolean) as Array<NonNullable<ReturnType<typeof byId.get>>>;
    if (members.length < 2) continue;
    members.forEach((m) => placed.add(m.id));
    groups.push({
      matchKey: g.match_key,
      matchKind: "email",
      contacts: members.map((m) => ({
        id: m.id,
        fullName: m.full_name,
        email: m.email,
        phone: m.phone,
        company: m.company,
        pillarName: m.pillar_name,
        createdAt: m.created_at,
      })),
    });
  }
  for (const g of phoneGroupsRaw) {
    const members = g.ids
      .filter((id) => !placed.has(id))
      .map((id) => byId.get(id))
      .filter(Boolean) as Array<NonNullable<ReturnType<typeof byId.get>>>;
    if (members.length < 2) continue;
    members.forEach((m) => placed.add(m.id));
    groups.push({
      matchKey: g.match_key,
      matchKind: "phone",
      contacts: members.map((m) => ({
        id: m.id,
        fullName: m.full_name,
        email: m.email,
        phone: m.phone,
        company: m.company,
        pillarName: m.pillar_name,
        createdAt: m.created_at,
      })),
    });
  }

  return groups;
}

export default async function DedupPage() {
  await requireRole("admin_grupo");
  const t = await getTranslations("crm.dedup");

  let groups: GroupRow[] = [];
  try {
    groups = await findDuplicateGroups();
  } catch (err) {
    console.error("[crm/dedup] find failed:", err);
    groups = [];
  }

  // Total candidate count for the heading.
  let totalContacts = 0;
  try {
    const r = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(contacts);
    totalContacts = r[0]?.c ?? 0;
  } catch {
    totalContacts = 0;
  }

  return (
    <div className="max-w-4xl mx-auto px-6 md:px-10 py-10 space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
          <Link href="/crm">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("backToList")}
          </Link>
        </Button>
        <h1 className="font-display text-5xl text-foreground leading-none">
          {t("title")}
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          {t("subtitle", { total: totalContacts })}
        </p>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">{t("noDuplicates")}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {t("groupsFound", { count: groups.length })}
          </p>
          <div className="space-y-4">
            {groups.map((g, i) => (
              <DedupGroup
                key={`${g.matchKind}-${g.matchKey}-${i}`}
                matchKey={g.matchKey}
                matchKind={g.matchKind}
                contacts={g.contacts}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
