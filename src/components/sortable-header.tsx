import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildSortHref, type SortDir } from "@/lib/sort";

type Props = {
  basePath: string;
  searchParams: Record<string, string | undefined>;
  column: string;
  defaultDir?: SortDir;
  children: React.ReactNode;
};

/**
 * <th> child component that toggles sort via URL. Use inside a table head.
 *
 *   <th><SortableHeader basePath="/crm" searchParams={sp} column="fullName">
 *     Nome
 *   </SortableHeader></th>
 */
export function SortableHeader({
  basePath,
  searchParams,
  column,
  defaultDir = "asc",
  children,
}: Props) {
  const isActive = searchParams.sort === column;
  const dir = isActive ? (searchParams.dir as SortDir) : null;
  const href = buildSortHref(basePath, searchParams, column, defaultDir);

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1 hover:text-foreground transition-colors",
        isActive ? "text-foreground" : "",
      )}
    >
      {children}
      {dir === "asc" ? (
        <ArrowUp className="h-3 w-3 opacity-70" />
      ) : dir === "desc" ? (
        <ArrowDown className="h-3 w-3 opacity-70" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </Link>
  );
}
