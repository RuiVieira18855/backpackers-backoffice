import Link from "next/link";
import { LayoutGrid, Plus, Upload } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { and, asc, desc, eq, sql, type SQL } from "drizzle-orm";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { getAllPillars, requireProfile } from "@/lib/dal";
import { ExportButton } from "@/components/export-button";
import { Pagination } from "@/components/pagination";
import { parsePagination } from "@/lib/pagination";
import { ContactsBulkBar } from "@/components/contacts/bulk-bar";

type SearchParams = Promise<{
  pillar?: string;
  stage?: string;
  type?: string;
  sort?: string;
  dir?: string;
  page?: string;
  perPage?: string;
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

const SORTABLE = {
  fullName: contacts.fullName,
  type: contacts.type,
  stage: contacts.stage,
  company: contacts.company,
  email: contacts.email,
  createdAt: contacts.createdAt,
};

export default async function CrmPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const t = await getTranslations("crm");
  const tStages = await getTranslations("crm.stages");
  const tTypes = await getTranslations("crm.types");
  const tCommon = await getTranslations("common");
  const profile = await requireProfile();
  const canBulkDelete =
    profile.role === "super_user" || profile.role === "admin_grupo";

  const sp = await searchParams;
  const spForHeaders = {
    pillar: sp.pillar,
    stage: sp.stage,
    type: sp.type,
    sort: sp.sort,
    dir: sp.dir,
  };
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

  // Default: most recent first; override via ?sort=&dir=
  const sortCol = sp.sort
    ? SORTABLE[sp.sort as keyof typeof SORTABLE]
    : undefined;
  const orderExpr = sortCol
    ? sp.dir === "asc"
      ? asc(sortCol)
      : desc(sortCol)
    : desc(contacts.createdAt);

  const pagination = parsePagination(sp, 25);

  const [rows, totalRows] = await Promise.all([
    db.query.contacts.findMany({
      with: { pillar: true, owner: true },
      where,
      orderBy: [orderExpr],
      limit: pagination.limit,
      offset: pagination.offset,
    }),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(contacts)
      .where(where ?? sql`true`)
      .then((r) => r[0]?.count ?? 0),
  ]);

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
          <ExportButton href="/api/export/contacts" />
          <Button asChild variant="outline">
            <Link href="/crm/contacts/import">
              <Upload className="mr-2 h-4 w-4" />
              {t("importCsv")}
            </Link>
          </Button>
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

      <form
        action="/crm"
        method="get"
        className="flex flex-wrap items-end gap-3 border-y border-border py-4"
      >
        {sp.sort && <input type="hidden" name="sort" value={sp.sort} />}
        {sp.dir && <input type="hidden" name="dir" value={sp.dir} />}

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
        {t("contactsCount", { count: totalRows })}
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
        <>
          <Card>
            <CardContent className="p-0">
              <ContactsBulkBar
                rows={rows.map((c) => ({
                  id: c.id,
                  fullName: c.fullName,
                  jobTitle: c.jobTitle,
                  type: c.type,
                  stage: c.stage,
                  pillarName: c.pillar?.name ?? null,
                  company: c.company,
                  email: c.email,
                }))}
                spForHeaders={spForHeaders}
                canBulkDelete={canBulkDelete}
              />
            </CardContent>
          </Card>
          <Pagination
            basePath="/crm"
            searchParams={sp}
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={totalRows}
          />
        </>
      )}
    </div>
  );
}
