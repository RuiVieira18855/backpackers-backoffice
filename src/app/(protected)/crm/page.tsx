import Link from "next/link";
import { LayoutGrid, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { and, desc, eq, type SQL } from "drizzle-orm";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { contacts, pillars as pillarsTable } from "@/lib/db/schema";
import { getAllPillars, requireProfile } from "@/lib/dal";

type SearchParams = Promise<{
  pillar?: string; // slug
  stage?: string;
  type?: string;
}>;

const STAGES = [
  "new",
  "qualified",
  "active",
  "on_hold",
  "closed_won",
  "closed_lost",
] as const;
const TYPES = ["lead", "customer", "partner", "vendor"] as const;

export default async function CrmPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const t = await getTranslations("crm");
  const tStages = await getTranslations("crm.stages");
  const tTypes = await getTranslations("crm.types");
  const tCommon = await getTranslations("common");
  await requireProfile();

  const sp = await searchParams;
  const allPillars = await getAllPillars();

  const pillarBySlug = sp.pillar
    ? allPillars.find((p) => p.slug === sp.pillar)
    : null;

  const filters: (SQL | undefined)[] = [
    pillarBySlug ? eq(contacts.pillarId, pillarBySlug.id) : undefined,
    sp.stage && (STAGES as readonly string[]).includes(sp.stage)
      ? eq(contacts.stage, sp.stage as (typeof STAGES)[number])
      : undefined,
    sp.type && (TYPES as readonly string[]).includes(sp.type)
      ? eq(contacts.type, sp.type as (typeof TYPES)[number])
      : undefined,
  ];

  const where = filters.some(Boolean) ? and(...filters) : undefined;
  const hasActiveFilters = Boolean(sp.pillar || sp.stage || sp.type);

  const rows = await db.query.contacts.findMany({
    with: { pillar: true, owner: true },
    where,
    orderBy: [desc(contacts.createdAt)],
    limit: 200,
  });

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-10 py-10 space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-5xl sm:text-6xl text-foreground leading-none">
            {t("title")}
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/crm/pipeline">
              <LayoutGrid className="mr-2 h-4 w-4" />
              {t("openKanban")}
            </Link>
          </Button>
          <Button asChild>
            <Link href="/crm/contacts/new">
              <Plus className="mr-2 h-4 w-4" />
              {t("newContact")}
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters: pure HTML <form method="get"> -> no JS needed */}
      <form
        action="/crm"
        method="get"
        className="flex flex-wrap items-end gap-3 border-y border-border py-4"
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground uppercase tracking-wider">
            {t("table.pillar")}
          </label>
          <select
            name="pillar"
            defaultValue={sp.pillar ?? ""}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs min-w-[160px]"
          >
            <option value="">{tCommon("all")}</option>
            {allPillars.map((p) => (
              <option key={p.id} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground uppercase tracking-wider">
            {t("table.type")}
          </label>
          <select
            name="type"
            defaultValue={sp.type ?? ""}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs min-w-[140px]"
          >
            <option value="">{tCommon("all")}</option>
            {TYPES.map((tp) => (
              <option key={tp} value={tp}>
                {tTypes(tp)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground uppercase tracking-wider">
            {t("table.stage")}
          </label>
          <select
            name="stage"
            defaultValue={sp.stage ?? ""}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs min-w-[160px]"
          >
            <option value="">{tCommon("all")}</option>
            {STAGES.map((st) => (
              <option key={st} value={st}>
                {tStages(st)}
              </option>
            ))}
          </select>
        </div>

        <Button type="submit" size="sm">
          {tCommon("filter")}
        </Button>
        {hasActiveFilters && (
          <Button asChild variant="ghost" size="sm">
            <Link href="/crm">{tCommon("cancel")}</Link>
          </Button>
        )}
      </form>

      <p className="text-sm text-muted-foreground">
        {t("contactsCount", { count: rows.length })}
      </p>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">{t("empty")}</p>
            <Button asChild className="mt-6">
              <Link href="/crm/contacts/new">
                <Plus className="mr-2 h-4 w-4" />
                {t("newContact")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/30">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                      {t("table.name")}
                    </th>
                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                      {t("table.type")}
                    </th>
                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                      {t("table.stage")}
                    </th>
                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                      {t("table.pillar")}
                    </th>
                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                      {t("table.company")}
                    </th>
                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                      {t("table.email")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((c) => (
                    <tr
                      key={c.id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-0">
                        <Link
                          href={`/crm/contacts/${c.id}`}
                          className="block px-0 py-3"
                        >
                          <div className="font-medium text-foreground">
                            {c.fullName}
                          </div>
                          {c.jobTitle && (
                            <div className="text-xs text-muted-foreground">
                              {c.jobTitle}
                            </div>
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <Link
                          href={`/crm/contacts/${c.id}`}
                          className="block py-3 -my-3"
                        >
                          {tTypes(c.type)}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/crm/contacts/${c.id}`}
                          className="inline-flex items-center rounded-full bg-accent/40 px-2 py-0.5 text-xs text-foreground"
                        >
                          {tStages(c.stage)}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <Link
                          href={`/crm/contacts/${c.id}`}
                          className="block py-3 -my-3"
                        >
                          {c.pillar?.name ?? "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <Link
                          href={`/crm/contacts/${c.id}`}
                          className="block py-3 -my-3"
                        >
                          {c.company ?? "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <Link
                          href={`/crm/contacts/${c.id}`}
                          className="block py-3 -my-3"
                        >
                          {c.email ?? "—"}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
