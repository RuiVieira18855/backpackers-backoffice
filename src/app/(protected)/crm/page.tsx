import Link from "next/link";
import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { desc } from "drizzle-orm";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { requireProfile } from "@/lib/dal";

export default async function CrmPage() {
  const t = await getTranslations("crm");
  await requireProfile();

  const rows = await db.query.contacts.findMany({
    with: { pillar: true, owner: true },
    orderBy: [desc(contacts.createdAt)],
    limit: 100,
  });

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-10 py-10 space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-6xl text-foreground leading-none">
            {t("title")}
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <Button asChild>
          <Link href="/crm/contacts/new">
            <Plus className="mr-2 h-4 w-4" />
            {t("newContact")}
          </Link>
        </Button>
      </div>

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
                    <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">
                          {c.fullName}
                        </div>
                        {c.jobTitle && (
                          <div className="text-xs text-muted-foreground">
                            {c.jobTitle}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {t(`types.${c.type}` as never)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-accent/40 px-2 py-0.5 text-xs text-foreground">
                          {t(`stages.${c.stage}` as never)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {c.pillar?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {c.company ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {c.email ?? "—"}
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
