import { Download } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getAllPillars, requireProfile } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProfileForm } from "./profile-form";

export default async function SettingsPage() {
  const profile = await requireProfile();
  const t = await getTranslations("settings");
  const tRoles = await getTranslations("roles");
  const pillars = await getAllPillars();

  return (
    <div className="max-w-4xl mx-auto px-6 md:px-10 py-10 space-y-8">
      <div>
        <h1 className="font-display text-6xl text-foreground leading-none">
          {t("title")}
        </h1>
        <p className="mt-2 text-base text-muted-foreground">{t("subtitle")}</p>
      </div>

      <ProfileForm
        email={profile.email}
        fullName={profile.fullName}
        avatarUrl={profile.avatarUrl}
        defaultPillarId={profile.defaultPillarId}
        roleLabel={tRoles(profile.role as never)}
        pillars={pillars.map((p) => ({ id: p.id, name: p.name }))}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("gdpr.title")}</CardTitle>
          <CardDescription>{t("gdpr.hint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" size="sm">
            <a href="/api/gdpr/export" download>
              <Download className="mr-2 h-3.5 w-3.5" />
              {t("gdpr.cta")}
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
