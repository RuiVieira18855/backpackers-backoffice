import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  ArrowRight,
  CalendarPlus,
  FolderPlus,
  Upload,
  UserPlus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Step = {
  key: "contact" | "event" | "project" | "doc";
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  enabled: boolean;
};

export type WelcomeCardProps = {
  fullName: string | null;
  isEmpty: boolean;
  hasCrm: boolean;
  hasOps: boolean;
  hasDocs: boolean;
};

export async function WelcomeCard({
  fullName,
  isEmpty,
  hasCrm,
  hasOps,
  hasDocs,
}: WelcomeCardProps) {
  if (!isEmpty) return null;
  const t = await getTranslations("dashboard.welcome");

  const steps: Step[] = (
    [
      {
        key: "contact",
        icon: UserPlus,
        href: "/crm/contacts/new",
        enabled: hasCrm,
      },
      {
        key: "event",
        icon: CalendarPlus,
        href: "/ops/events/new",
        enabled: hasOps,
      },
      {
        key: "project",
        icon: FolderPlus,
        href: "/ops/projects/new",
        enabled: hasOps,
      },
      { key: "doc", icon: Upload, href: "/docs/new", enabled: hasDocs },
    ] satisfies Step[]
  ).filter((s) => s.enabled);

  return (
    <Card className="border-accent/40 bg-gradient-to-br from-accent/10 to-transparent">
      <CardHeader>
        <CardTitle className="text-lg">
          {t("title", { name: fullName ?? "" })}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </CardHeader>
      <CardContent>
        <ol className="grid gap-3 sm:grid-cols-2">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <li key={s.key}>
                <Link
                  href={s.href}
                  className="group flex items-center gap-3 rounded-lg border border-border bg-background/60 p-3 hover:border-accent hover:bg-background transition-colors"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground shrink-0">
                    {i + 1}
                  </span>
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="flex-1 text-sm text-foreground">
                    {t(`steps.${s.key}` as never)}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                </Link>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
