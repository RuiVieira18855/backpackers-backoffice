import { ExternalLink, Map, Boxes, Rocket, Compass, Sparkles } from "lucide-react";
import { asc, eq, inArray } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { appAccess, apps } from "@/lib/db/schema";
import { getCurrentProfile } from "@/lib/dal";

type IconComp = React.ComponentType<{ className?: string }>;

/**
 * Whitelisted lucide icons we allow apps.icon to reference. Anything else
 * falls back to Boxes. Keeps the bundle small (no dynamic imports) and
 * scoped — admins can't smuggle arbitrary icons into the sidebar.
 */
const ICON_MAP: Record<string, IconComp> = {
  Map,
  Boxes,
  Rocket,
  Compass,
  Sparkles,
};

/**
 * Sidebar group listing the apps the current user can open. Renders nothing
 * if the user has no accessible apps (or no apps in the catalog have a URL
 * to jump to).
 *
 * - super_user sees every active app that has a public URL.
 * - other internal users see only apps where they hold an active/trial entitlement.
 */
export async function AppLauncherGroup() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  let visibleApps: Array<{
    key: string;
    name: string;
    url: string | null;
    icon: string | null;
  }> = [];

  try {
    if (profile.role === "super_user") {
      // Super_user: show every active app with a URL.
      visibleApps = await db
        .select({
          key: apps.key,
          name: apps.name,
          url: apps.url,
          icon: apps.icon,
        })
        .from(apps)
        .where(eq(apps.isActive, true))
        .orderBy(asc(apps.name));
    } else {
      // Everyone else: show only apps where they have active/trial access.
      const grants = await db
        .select({
          app: appAccess.app,
          status: appAccess.status,
          expiresAt: appAccess.expiresAt,
        })
        .from(appAccess)
        .where(eq(appAccess.userId, profile.id));

      const keys = grants
        .filter((g) => {
          if (g.status !== "trial" && g.status !== "active") return false;
          if (g.expiresAt && g.expiresAt.getTime() < Date.now()) return false;
          return true;
        })
        .map((g) => g.app);

      if (keys.length === 0) return null;

      visibleApps = await db
        .select({
          key: apps.key,
          name: apps.name,
          url: apps.url,
          icon: apps.icon,
        })
        .from(apps)
        .where(inArray(apps.key, keys))
        .orderBy(asc(apps.name));
    }
  } catch (err) {
    console.error("[AppLauncher] fetch failed:", err);
    return null;
  }

  // Only surface apps with a URL — nothing to link to otherwise.
  const withUrl = visibleApps.filter((a) => Boolean(a.url));
  if (withUrl.length === 0) return null;

  const t = await getTranslations("sidebar");

  return (
    <div className="flex flex-col gap-0.5 px-3 py-2">
      <p className="px-2 pb-1 text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
        {t("appsLabel")}
      </p>
      {withUrl.map((a) => {
        const Icon = (a.icon && ICON_MAP[a.icon]) || Boxes;
        return (
          <a
            key={a.key}
            href={a.url!}
            target="_blank"
            rel="noreferrer"
            className="group flex items-center gap-2.5 px-2 py-1.5 text-sm rounded-md text-foreground/80 hover:text-foreground hover:bg-muted transition-colors"
          >
            <Icon className="h-3.5 w-3.5 text-accent-foreground" />
            <span className="flex-1 truncate">{a.name}</span>
            <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        );
      })}
    </div>
  );
}
