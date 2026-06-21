"use client";

import { useTransition } from "react";
import Link from "next/link";
import {
  Check,
  Globe,
  LogOut,
  Monitor,
  Moon,
  Settings,
  Shield,
  Sun,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { signOut, setLocale } from "@/app/(protected)/actions";
import {
  LOCALES,
  LOCALE_LABELS,
  LOCALE_FLAGS,
  type Locale,
} from "@/i18n/locales";

type Props = {
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
  roleLabel: string;
  isAdminGrupo: boolean;
};

export function UserMenu({
  fullName,
  email,
  avatarUrl,
  roleLabel,
  isAdminGrupo,
}: Props) {
  const t = useTranslations("common");
  const tNav = useTranslations("nav");
  const tTheme = useTranslations("settings.theme");
  const tLocale = useTranslations("locale");
  const currentLocale = useLocale() as Locale;
  const { theme, setTheme } = useTheme();
  const [signOutPending, startSignOutTransition] = useTransition();
  const [localePending, startLocaleTransition] = useTransition();

  function onSignOut() {
    startSignOutTransition(() => signOut());
  }

  function onLocaleChange(loc: Locale) {
    if (loc === currentLocale) return;
    startLocaleTransition(() => setLocale(loc));
  }

  const displayName = fullName ?? email;
  const initials = displayName
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-3 h-auto py-1.5 pl-2 pr-3">
          <span className="hidden sm:flex flex-col items-end leading-tight">
            <span className="text-sm text-foreground">{displayName}</span>
            <span className="text-xs text-muted-foreground">{roleLabel}</span>
          </span>
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-medium">
              {initials || "?"}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="text-sm">{displayName}</span>
            <span className="text-xs text-muted-foreground font-normal">
              {email}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/settings" className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            {tNav("settings")}
          </Link>
        </DropdownMenuItem>

        {/* Theme submenu */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            {theme === "dark" ? (
              <Moon className="mr-2 h-4 w-4" />
            ) : theme === "light" ? (
              <Sun className="mr-2 h-4 w-4" />
            ) : (
              <Monitor className="mr-2 h-4 w-4" />
            )}
            {tTheme("section")}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {(["light", "dark", "system"] as const).map((opt) => (
              <DropdownMenuItem
                key={opt}
                onClick={() => setTheme(opt)}
                className="cursor-pointer"
              >
                {opt === "light" ? (
                  <Sun className="mr-2 h-4 w-4" />
                ) : opt === "dark" ? (
                  <Moon className="mr-2 h-4 w-4" />
                ) : (
                  <Monitor className="mr-2 h-4 w-4" />
                )}
                <span className="flex-1">{tTheme(opt)}</span>
                {theme === opt && <Check className="h-4 w-4 opacity-70" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Locale submenu */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Globe className="mr-2 h-4 w-4" />
            {tLocale("section")}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {LOCALES.map((loc) => (
              <DropdownMenuItem
                key={loc}
                onClick={() => onLocaleChange(loc)}
                disabled={localePending}
                className="cursor-pointer"
              >
                <span className="mr-2 text-base">{LOCALE_FLAGS[loc]}</span>
                <span className="flex-1">{LOCALE_LABELS[loc]}</span>
                {currentLocale === loc && (
                  <Check className="h-4 w-4 opacity-70" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {isAdminGrupo && (
          <DropdownMenuItem asChild>
            <Link href="/admin/users" className="cursor-pointer">
              <Shield className="mr-2 h-4 w-4" />
              {tNav("admin")}
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onSignOut}
          disabled={signOutPending}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {signOutPending ? t("signingOut") : t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
