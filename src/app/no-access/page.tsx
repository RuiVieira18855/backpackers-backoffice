import Link from "next/link";
import { asc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { appAccess, apps } from "@/lib/db/schema";
import { getAuthUser } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SignOutButton } from "@/components/sign-out-button";

export const metadata = {
  title: "Sem acesso ao backoffice — Backpackers",
};

/**
 * Landing page for customer signups that accidentally hit the backoffice URL.
 * Shows the apps they DO have entitlements for, plus a sign-out button.
 * Public route — no auth required to render, but if there's a session we
 * personalise it.
 */
export default async function NoAccessPage() {
  const user = await getAuthUser();

  // If the user is signed in, surface the apps they actually have access to
  // so they can jump straight there.
  let entitled: Array<{
    key: string;
    name: string;
    url: string | null;
    status: string;
  }> = [];
  if (user) {
    try {
      entitled = await db
        .select({
          key: apps.key,
          name: apps.name,
          url: apps.url,
          status: appAccess.status,
        })
        .from(appAccess)
        .innerJoin(apps, eq(apps.key, appAccess.app))
        .where(eq(appAccess.userId, user.id))
        .orderBy(asc(apps.name));
    } catch (err) {
      console.error("[/no-access] failed to fetch entitlements:", err);
    }
    // filter out expired/revoked
    entitled = entitled.filter(
      (e) => e.status === "trial" || e.status === "active",
    );
    // dedupe by key (defensive)
    void isNotNull;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <h1 className="font-display text-5xl leading-none">Backpackers</h1>
          <p className="mt-3 text-base text-muted-foreground">
            Este URL é o backoffice da equipa Backpackers. A tua conta é de
            cliente — não tens acesso a esta área.
          </p>
        </div>

        {entitled.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">As tuas apps</CardTitle>
              <CardDescription>
                Continua a partir daqui:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {entitled.map((e) => (
                <div
                  key={e.key}
                  className="flex items-center justify-between gap-3 rounded-md border border-border px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {e.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {e.status === "trial" ? "Em trial" : "Activo"}
                    </p>
                  </div>
                  {e.url ? (
                    <Button asChild size="sm">
                      <a href={e.url} target="_blank" rel="noreferrer">
                        Abrir
                      </a>
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">
                      URL não disponível
                    </span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Não encontrámos apps activas para a tua conta. Se compraste
                uma app Backpackers há pouco, contacta o suporte.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-center gap-3">
          {user ? (
            <SignOutButton />
          ) : (
            <Button asChild variant="ghost">
              <Link href="/login">Voltar ao login</Link>
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Achas que isto é um erro? Contacta a equipa Backpackers.
        </p>
      </div>
    </div>
  );
}
