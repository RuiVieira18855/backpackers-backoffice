import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { hasSkill } from "@/lib/dal";
import { AppNav, type NavItem } from "./app-nav";
import { AppSidebar } from "./app-sidebar";
import { AppSidebarTrigger } from "./app-sidebar-trigger";
import { GlobalSearch } from "./global-search";
import { Logo } from "./logo";
import { NotificationsBell } from "./notifications/bell";
import { UserMenu } from "./user-menu";

type Props = {
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
  role: string;
};

export async function AppHeader({ fullName, email, avatarUrl, role }: Props) {
  const tRoles = await getTranslations("roles");
  const tSidebar = await getTranslations("sidebar");
  const roleLabel = tRoles.has(role as never) ? tRoles(role as never) : role;

  // Build the nav list based on skills. Dashboard is always shown.
  const [hasCrm, hasOps, hasDocs, hasFinance, hasAdmin] = await Promise.all([
    hasSkill("crm"),
    hasSkill("ops"),
    hasSkill("docs"),
    hasSkill("finance"),
    hasSkill("admin"),
  ]);

  const items: NavItem[] = [
    { href: "/dashboard", key: "dashboard" },
    ...(hasCrm ? [{ href: "/crm", key: "crm" as const }] : []),
    ...(hasOps ? [{ href: "/ops", key: "operations" as const }] : []),
    ...(hasDocs ? [{ href: "/docs", key: "documents" as const }] : []),
    ...(hasFinance ? [{ href: "/finance", key: "finance" as const }] : []),
    ...(hasAdmin ? [{ href: "/admin", key: "admin" as const }] : []),
  ];

  return (
    <header className="border-b border-border bg-background sticky top-0 z-30">
      <div className="flex items-center justify-between px-4 sm:px-6 md:px-10 py-3 gap-3 sm:gap-6">
        <div className="flex items-center gap-2 md:gap-8 min-w-0">
          <AppSidebarTrigger label={tSidebar("title")}>
            <AppSidebar variant="mobile" />
          </AppSidebarTrigger>

          <Link
            href="/dashboard"
            className="flex items-center gap-2 sm:gap-3 shrink-0"
          >
            <Logo size="sm" />
            <span className="font-display text-lg sm:text-2xl text-foreground tracking-wide hidden xs:inline">
              <span className="hidden sm:inline">Outpost</span>
              <span className="sm:hidden">Outpost</span>
            </span>
          </Link>
          <AppNav items={items} />
        </div>
        <div className="flex items-center gap-2">
          <GlobalSearch />
          <NotificationsBell />
          <UserMenu
            fullName={fullName}
            email={email}
            avatarUrl={avatarUrl}
            roleLabel={roleLabel}
            isAdminGrupo={role === "admin_grupo" || role === "super_user"}
          />
        </div>
      </div>
    </header>
  );
}
