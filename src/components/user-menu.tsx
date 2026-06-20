"use client";

import { useTransition } from "react";
import Link from "next/link";
import { LogOut, Settings, Shield } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/(protected)/actions";

type Props = {
  fullName: string | null;
  email: string;
  roleLabel: string;
  isAdminGrupo: boolean;
};

export function UserMenu({ fullName, email, roleLabel, isAdminGrupo }: Props) {
  const t = useTranslations("common");
  const tNav = useTranslations("nav");
  const [pending, startTransition] = useTransition();

  function onSignOut() {
    startTransition(() => signOut());
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
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-medium">
            {initials || "?"}
          </span>
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
          disabled={pending}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {pending ? t("signingOut") : t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
