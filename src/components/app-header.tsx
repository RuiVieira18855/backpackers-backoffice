import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AppNav } from "./app-nav";
import { AppSidebar } from "./app-sidebar";
import { AppSidebarTrigger } from "./app-sidebar-trigger";
import { GlobalSearch } from "./global-search";
import { Logo } from "./logo";
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
          <AppNav />
        </div>
        <div className="flex items-center gap-2">
          <GlobalSearch />
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
