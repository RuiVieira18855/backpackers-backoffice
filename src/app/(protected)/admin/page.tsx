import Link from "next/link";
import {
  Baby,
  Boxes,
  ClipboardCheck,
  FileText,
  Mail,
  MessageSquare,
  Map,
  Leaf,
  Mountain,
  Newspaper,
  Settings,
  Shield,
  Webhook,
  Workflow,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireSkill } from "@/lib/dal";

type Section = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  titleKey:
    | "users"
    | "templates"
    | "customFields"
    | "apps"
    | "workflows"
    | "webhooks"
    | "audit"
    | "resendTest"
    | "feedback";
};

const SECTIONS: Section[] = [
  { href: "/admin/users", icon: Shield, titleKey: "users" },
  { href: "/admin/apps", icon: Boxes, titleKey: "apps" },
  { href: "/admin/feedback", icon: MessageSquare, titleKey: "feedback" },
  { href: "/admin/templates", icon: FileText, titleKey: "templates" },
  { href: "/admin/custom-fields", icon: Settings, titleKey: "customFields" },
  { href: "/admin/workflows", icon: Workflow, titleKey: "workflows" },
  { href: "/admin/webhooks", icon: Webhook, titleKey: "webhooks" },
  { href: "/admin/audit", icon: ClipboardCheck, titleKey: "audit" },
  { href: "/admin/resend-test", icon: Mail, titleKey: "resendTest" },
];

export default async function AdminLandingPage() {
  await requireSkill("admin");
  const t = await getTranslations("admin.landing");
  const tUsers = await getTranslations("admin.users");
  const tTemplates = await getTranslations("admin.templates");
  const tCustomFields = await getTranslations("admin.customFields");
  const tApps = await getTranslations("admin.apps");
  const tWorkflows = await getTranslations("admin.workflows");
  const tWebhooks = await getTranslations("admin.webhooks");
  const tAudit = await getTranslations("admin.audit");
  const tResendTest = await getTranslations("admin.resendTest");
  const tFeedback = await getTranslations("admin.feedback");

  const labels = {
    apps: { title: tApps("title"), subtitle: tApps("cardSubtitle") },
    users: { title: tUsers("title"), subtitle: tUsers("subtitle") },
    templates: {
      title: tTemplates("title"),
      subtitle: tTemplates("subtitle"),
    },
    customFields: {
      title: tCustomFields("title"),
      subtitle: tCustomFields("subtitle"),
    },
    workflows: {
      title: tWorkflows("title"),
      subtitle: tWorkflows("subtitle"),
    },
    webhooks: {
      title: tWebhooks("title"),
      subtitle: tWebhooks("subtitle"),
    },
    audit: { title: tAudit("title"), subtitle: tAudit("subtitle") },
    resendTest: {
      title: tResendTest("title"),
      subtitle: tResendTest("subtitle"),
    },
    feedback: {
      title: tFeedback("title"),
      subtitle: tFeedback("subtitle"),
    },
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 space-y-10">
      <div>
        <h1 className="font-display text-4xl sm:text-6xl text-foreground leading-none">
          {t("title")}
        </h1>
        <p className="mt-2 text-base text-muted-foreground">{t("subtitle")}</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const { title, subtitle } = labels[s.titleKey];
          return (
            <Link key={s.href} href={s.href} className="group">
              <Card className="h-full transition-colors group-hover:border-accent">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base">{title}</CardTitle>
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <CardDescription>{subtitle}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs uppercase tracking-wider text-accent-foreground group-hover:text-foreground">
                    {t("open")} →
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}

        <Link href="/admin/blog" className="group">
          <Card className="h-full transition-colors group-hover:border-accent">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-base">Blog</CardTitle>
                <Newspaper className="h-5 w-5 text-muted-foreground" />
              </div>
              <CardDescription>
                Escreve e publica os artigos do site.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs uppercase tracking-wider text-accent-foreground group-hover:text-foreground">
                {t("open")} →
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/herbarium" className="group">
          <Card className="h-full transition-colors group-hover:border-accent">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-base">Herbarium</CardTitle>
                <Leaf className="h-5 w-5 text-muted-foreground" />
              </div>
              <CardDescription>
                Fichas de flora ibérica do guia de campo e do deck Flora.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs uppercase tracking-wider text-accent-foreground group-hover:text-foreground">
                {t("open")} →
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/babyland" className="group">
          <Card className="h-full transition-colors group-hover:border-accent">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-base">BabyLand</CardTitle>
                <Baby className="h-5 w-5 text-muted-foreground" />
              </div>
              <CardDescription>
                Eventos, parceiros, artigos, receitas e locais da app BabyLand.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs uppercase tracking-wider text-accent-foreground group-hover:text-foreground">
                {t("open")} →
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/adventures" className="group">
          <Card className="h-full transition-colors group-hover:border-accent">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-base">Caminhadas</CardTitle>
                <Mountain className="h-5 w-5 text-muted-foreground" />
              </div>
              <CardDescription>
                Cria, edita e arquiva a agenda pública do site.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs uppercase tracking-wider text-accent-foreground group-hover:text-foreground">
                {t("open")} →
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/trails" className="group">
          <Card className="h-full transition-colors group-hover:border-accent">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-base">Biblioteca de trilhos</CardTitle>
                <Map className="h-5 w-5 text-muted-foreground" />
              </div>
              <CardDescription>
                500 percursos de referência. Cria caminhadas a partir deles.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs uppercase tracking-wider text-accent-foreground group-hover:text-foreground">
                {t("open")} →
              </p>
            </CardContent>
          </Card>
        </Link>
      </section>
    </div>
  );
}
