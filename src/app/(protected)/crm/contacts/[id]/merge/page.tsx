import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { asc, eq, ne } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { requireRole } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ManualMergeForm } from "./merge-form";

type Props = { params: Promise<{ id: string }> };

export default async function ManualMergePage({ params }: Props) {
  await requireRole("admin_grupo");
  const { id } = await params;
  const t = await getTranslations("crm.mergeManual");

  const keeper = await db.query.contacts.findFirst({
    where: eq(contacts.id, id),
    with: { pillar: true },
  });
  if (!keeper) notFound();

  const others = await db
    .select({
      id: contacts.id,
      fullName: contacts.fullName,
      email: contacts.email,
      phone: contacts.phone,
      company: contacts.company,
    })
    .from(contacts)
    .where(ne(contacts.id, id))
    .orderBy(asc(contacts.fullName))
    .limit(1000);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
          <Link href={`/crm/contacts/${id}`}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("backToContact")}
          </Link>
        </Button>
        <h1 className="font-display text-4xl sm:text-5xl text-foreground leading-none">
          {t("title")}
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          {t("subtitle", { name: keeper.fullName })}
        </p>
      </div>

      <Card>
        <CardContent className="py-4 space-y-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {t("keeper")}
          </p>
          <div>
            <p className="text-sm font-medium text-foreground">
              {keeper.fullName}
            </p>
            <p className="text-xs text-muted-foreground">
              {keeper.email ?? "—"}
              {keeper.phone ? ` · ${keeper.phone}` : ""}
              {keeper.company ? ` · ${keeper.company}` : ""}
              {keeper.pillar ? ` · ${keeper.pillar.name}` : ""}
            </p>
          </div>
        </CardContent>
      </Card>

      <ManualMergeForm
        keeperId={id}
        others={others.map((o) => ({
          id: o.id,
          label:
            o.fullName +
            (o.email ? ` — ${o.email}` : "") +
            (o.company ? ` (${o.company})` : ""),
        }))}
      />
    </div>
  );
}
