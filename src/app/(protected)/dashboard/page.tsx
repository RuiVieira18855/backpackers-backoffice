import { getTranslations } from "next-intl/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAllPillars, requireProfile } from "@/lib/dal";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const profile = await requireProfile();
  const pillars = await getAllPillars();

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-10 py-10 space-y-10">
      <div>
        <p className="text-sm text-muted-foreground">
          {t("hello", { name: profile.fullName || profile.email })}
        </p>
        <h1 className="font-display text-6xl text-foreground leading-none mt-1">
          {t("title")}
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          {t(`greetings.${profile.role}` as never)}
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-sm uppercase tracking-wider text-muted-foreground">
          {t("sectionPillars")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((pilar) => (
            <Card key={pilar.id}>
              <CardHeader>
                <CardTitle className="font-display text-2xl tracking-wide">
                  {pilar.name}
                </CardTitle>
                <CardDescription className="text-xs uppercase tracking-wider">
                  {pilar.slug}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {pilar.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm uppercase tracking-wider text-muted-foreground">
          {t("sectionModules")}
        </h2>
        <Card>
          <CardHeader>
            <CardTitle>{t("modulesCardTitle")}</CardTitle>
            <CardDescription>{t("modulesCardDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
                <span className="text-foreground">{t("modules.crm")}</span>
                <span className="text-xs text-muted-foreground">
                  &middot; activo
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
                <span className="text-foreground">{t("modules.ops")}</span>
                <span className="text-xs text-muted-foreground">
                  &middot; {t("comingSoon")}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
                <span className="text-foreground">{t("modules.docs")}</span>
                <span className="text-xs text-muted-foreground">
                  &middot; {t("comingSoon")}
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
