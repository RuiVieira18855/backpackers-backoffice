import Link from "next/link";
import {
  Calendar,
  FileText,
  FolderOpen,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import {
  auditLog,
  deals,
  documents,
  events,
  projects,
  transactions,
} from "@/lib/db/schema";
import { hasSkill } from "@/lib/dal";

type Item = {
  id: string;
  kind:
    | "event"
    | "project"
    | "deal"
    | "transaction"
    | "document"
    | "audit";
  date: Date;
  title: string;
  hint: string | null;
  href: string;
  badge?: string;
};

const ICON: Record<Item["kind"], React.ComponentType<{ className?: string }>> = {
  event: Calendar,
  project: FolderOpen,
  deal: Target,
  transaction: TrendingUp,
  document: FileText,
  audit: FileText,
};

type Props = {
  contactId: string;
};

/**
 * Aggregates events + projects + deals + linked transactions/docs into a
 * chronological timeline for a single contact. Each query is wrapped to be
 * defensive — failure of one source just hides that section, the rest still
 * renders.
 */
export async function ContactTimeline({ contactId }: Props) {
  const t = await getTranslations("crm.timeline");
  const tStages = await getTranslations("crm.stages");
  const tDealStages = await getTranslations("deals.stages");
  const tEventStatuses = await getTranslations("ops.eventStatuses");
  const tTypes = await getTranslations("finance.types");

  const [hasFinanceSkill, hasDocsSkill] = await Promise.all([
    hasSkill("finance"),
    hasSkill("docs"),
  ]);

  const safe = async <T,>(p: Promise<T>, fallback: T): Promise<T> => {
    try {
      return await p;
    } catch (err) {
      console.error("[timeline] query failed:", err);
      return fallback;
    }
  };

  const [contactEvents, contactProjects, contactDeals] = await Promise.all([
    safe(
      db
        .select()
        .from(events)
        .where(eq(events.clientContactId, contactId))
        .orderBy(desc(events.createdAt))
        .limit(50),
      [] as Array<typeof events.$inferSelect>,
    ),
    safe(
      db
        .select()
        .from(projects)
        .where(eq(projects.clientContactId, contactId))
        .orderBy(desc(projects.createdAt))
        .limit(50),
      [] as Array<typeof projects.$inferSelect>,
    ),
    safe(
      db
        .select()
        .from(deals)
        .where(eq(deals.contactId, contactId))
        .orderBy(desc(deals.updatedAt))
        .limit(50),
      [] as Array<typeof deals.$inferSelect>,
    ),
  ]);

  // Linked transactions / documents (if user has skills) — pull by linked event/project.
  const eventIds = contactEvents.map((e) => e.id);
  const projectIds = contactProjects.map((p) => p.id);

  let linkedTransactions: Array<typeof transactions.$inferSelect> = [];
  let linkedDocs: Array<typeof documents.$inferSelect> = [];

  if (hasFinanceSkill && (eventIds.length || projectIds.length)) {
    linkedTransactions = await safe(
      db
        .select()
        .from(transactions)
        .where(
          or(
            eventIds.length
              ? inArray(transactions.eventId, eventIds)
              : undefined,
            projectIds.length
              ? inArray(transactions.projectId, projectIds)
              : undefined,
          )!,
        )
        .orderBy(desc(transactions.date))
        .limit(50),
      [] as Array<typeof transactions.$inferSelect>,
    );
  }
  if (hasDocsSkill && (eventIds.length || projectIds.length)) {
    linkedDocs = await safe(
      db
        .select()
        .from(documents)
        .where(
          or(
            eventIds.length ? inArray(documents.eventId, eventIds) : undefined,
            projectIds.length
              ? inArray(documents.projectId, projectIds)
              : undefined,
          )!,
        )
        .orderBy(desc(documents.createdAt))
        .limit(50),
      [] as Array<typeof documents.$inferSelect>,
    );
  }

  // Audit log entries for this contact's id (changes to the contact itself).
  const contactAudit = await safe(
    db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.entityType, "contact"),
          eq(auditLog.entityId, contactId),
        ),
      )
      .orderBy(desc(auditLog.createdAt))
      .limit(20),
    [] as Array<typeof auditLog.$inferSelect>,
  );

  // Merge into a single timeline.
  const items: Item[] = [];

  for (const e of contactEvents) {
    items.push({
      id: `ev-${e.id}`,
      kind: "event",
      date: e.startAt ?? e.createdAt,
      title: e.name,
      hint: e.location,
      href: `/ops/events/${e.id}`,
      badge: tEventStatuses(e.status),
    });
  }
  for (const p of contactProjects) {
    items.push({
      id: `pr-${p.id}`,
      kind: "project",
      date: p.createdAt,
      title: p.name,
      hint: p.description ?? null,
      href: `/ops/projects/${p.id}`,
      badge: tStages(p.status as never),
    });
  }
  for (const d of contactDeals) {
    items.push({
      id: `dl-${d.id}`,
      kind: "deal",
      date: d.updatedAt,
      title: d.name,
      hint: d.value
        ? new Intl.NumberFormat("pt-PT", {
            style: "currency",
            currency: d.currency,
            maximumFractionDigits: 0,
          }).format(Number(d.value))
        : null,
      href: `/crm/deals/${d.id}`,
      badge: tDealStages(d.stage),
    });
  }
  for (const tx of linkedTransactions) {
    items.push({
      id: `tx-${tx.id}`,
      kind: "transaction",
      date: new Date(tx.date),
      title: tx.description,
      hint:
        (tx.type === "income" ? "+" : "−") +
        new Intl.NumberFormat("pt-PT", {
          style: "currency",
          currency: tx.currency,
          maximumFractionDigits: 0,
        }).format(Number(tx.amount)),
      href: `/finance/${tx.id}`,
      badge: tTypes(tx.type),
    });
  }
  for (const d of linkedDocs) {
    items.push({
      id: `dc-${d.id}`,
      kind: "document",
      date: d.createdAt,
      title: d.title,
      hint: d.fileName,
      href: `/docs/${d.id}`,
    });
  }
  for (const a of contactAudit) {
    items.push({
      id: `au-${a.id}`,
      kind: "audit",
      date: a.createdAt,
      title: t(`auditAction.${a.action}` as never),
      hint: null,
      href: `/crm/contacts/${contactId}`,
    });
  }

  items.sort((a, b) => b.date.getTime() - a.date.getTime());
  const recent = items.slice(0, 30);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <CardDescription>
          {t("hint", { count: items.length })}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {recent.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground italic">
            {t("empty")}
          </p>
        ) : (
          <ol className="divide-y divide-border">
            {recent.map((item) => {
              const Icon = ICON[item.kind];
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="flex items-start gap-3 px-6 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {item.title}
                          </p>
                          {item.hint && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {item.hint}
                            </p>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground shrink-0">
                          {new Intl.DateTimeFormat("pt-PT", {
                            dateStyle: "short",
                          }).format(item.date)}
                        </div>
                      </div>
                      {item.badge && (
                        <span className="mt-1 inline-flex items-center rounded-full bg-accent/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-foreground">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
