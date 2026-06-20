import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AppNav } from "./app-nav";
import { SignOutButton } from "./sign-out-button";

type Props = {
  fullName: string | null;
  email: string;
  role: string;
};

export async function AppHeader({ fullName, email, role }: Props) {
  const tRoles = await getTranslations("roles");
  const roleLabel = tRoles.has(role as never) ? tRoles(role as never) : role;

  return (
    <header className="border-b border-border bg-background sticky top-0 z-30">
      <div className="flex items-center justify-between px-6 md:px-10 py-3 gap-6">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="font-display text-2xl text-foreground tracking-wide">
              Backpackers{" "}
              <span className="text-accent-foreground bg-accent px-1.5 rounded-sm">
                Backoffice
              </span>
            </span>
          </Link>
          <AppNav />
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end leading-tight">
            <span className="text-sm text-foreground">
              {fullName || email}
            </span>
            <span className="text-xs text-muted-foreground">{roleLabel}</span>
          </div>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
