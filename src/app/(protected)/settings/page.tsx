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
import { getConnection } from "@/lib/oauth/store";
import { isGoogleConfigured } from "@/lib/oauth/google";
import { isMicrosoftConfigured } from "@/lib/oauth/microsoft";
import { ProfileForm } from "./profile-form";
import { CalendarSyncCard } from "./calendar-sync-card";

export default async function SettingsPage() {
  const profile = await requireProfile();
  const t = await getTranslations("settings");
  const tRoles = await getTranslations("roles");
  const [pillars, googleConn, microsoftConn] = await Promise.all([
    getAllPillars(),
    getConnection(profile.id, "google").catch(() => null),
    getConnection(profile.id, "microsoft").catch(() => null),
  ]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 space-y-8">
      <div>
        <h1 className="font-display text-4xl sm:text-6xl text-foreground leading-none">
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

      <CalendarSyncCard
        google={
          googleConn
            ? {
                provider: "google",
                externalEmail: googleConn.externalEmail,
                defaultPillarId: googleConn.defaultPillarId,
                lastSyncedAt: googleConn.lastSyncedAt,
              }
            : null
        }
        microsoft={
          microsoftConn
            ? {
                provider: "microsoft",
                externalEmail: microsoftConn.externalEmail,
                defaultPillarId: microsoftConn.defaultPillarId,
                lastSyncedAt: microsoftConn.lastSyncedAt,
              }
            : null
        }
        pillars={pillars.map((p) => ({ id: p.id, name: p.name }))}
        googleConfigured={isGoogleConfigured()}
        microsoftConfigured={isMicrosoftConfigured()}
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
