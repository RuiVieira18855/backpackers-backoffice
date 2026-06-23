"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type NavKey =
  | "dashboard"
  | "crm"
  | "operations"
  | "documents"
  | "finance"
  | "admin";

export type NavItem = { href: string; key: NavKey };

type Props = {
  items: NavItem[];
};

export function AppNav({ items }: Props) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex items-center gap-1">
      {items.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "px-3 py-1.5 text-sm rounded-md transition-colors",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            {t(item.key)}
          </Link>
        );
      })}
    </nav>
  );
}
