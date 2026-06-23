import Link from "next/link";
import { FileText, FileUp } from "lucide-react";
import { desc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { hasSkill } from "@/lib/dal";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Props = {
  eventId?: string;
  projectId?: string;
};

function fmtSize(bytes: number | null): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 102.4) / 10} KB`;
  return `${Math.round(bytes / (1024 * 102.4)) / 10} MB`;
}

/**
 * Server component — renders a documents section linked to the given event
 * or project. Only visible to users with the `docs` skill (or super_user).
 */
export async function LinkedDocsCard({ eventId, projectId }: Props) {
  const allowed = await hasSkill("docs");
  if (!allowed) return null;
  if (!eventId && !projectId) return null;

  const t = await getTranslations("docs.linked");
  const tTypes = await getTranslations("docs.types");

  const where = eventId
    ? eq(documents.eventId, eventId)
    : eq(documents.projectId, projectId!);

  const rows = await db.query.documents.findMany({
    where,
    orderBy: [desc(documents.createdAt)],
    limit: 20,
  });

  const newQuery = eventId ? `event=${eventId}` : `project=${projectId}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              {t("title")}
            </CardTitle>
            <CardDescription>
              {t("count", { count: rows.length })}
            </CardDescription>
          </div>
          <Button asChild size="sm">
            <Link href={`/docs/new?${newQuery}`}>
              <FileUp className="mr-2 h-3.5 w-3.5" />
              {t("addDocument")}
            </Link>
          </Button>
        </div>
      </CardHeader>

      {rows.length > 0 && (
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {rows.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/docs/${d.id}`}
                  className="flex items-center justify-between gap-3 px-6 py-3 hover:bg-muted/30 transition-colors text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="font-medium text-foreground truncate">
                        {d.title}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-accent/40 px-2 py-0.5 text-xs text-foreground shrink-0">
                        {tTypes(d.type)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground ml-5 mt-0.5">
                      {d.fileName} · {fmtSize(d.fileSize)}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0">
                    {new Intl.DateTimeFormat("pt-PT", {
                      dateStyle: "short",
                    }).format(d.createdAt)}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      )}

      {rows.length === 0 && (
        <CardContent>
          <p className="text-sm text-muted-foreground italic">{t("empty")}</p>
        </CardContent>
      )}
    </Card>
  );
}
