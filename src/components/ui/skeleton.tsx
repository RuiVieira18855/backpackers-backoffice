import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-muted animate-pulse rounded-md", className)}
      {...props}
    />
  );
}

export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4", i === lines - 1 ? "w-3/5" : "w-full")}
        />
      ))}
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
      <Skeleton className="h-9 w-9 rounded-full shrink-0" />
      <div className="flex-1 flex flex-col gap-1.5">
        <Skeleton className="h-3.5 w-1/3" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <Skeleton className="h-6 w-16 shrink-0" />
    </div>
  );
}

export function SkeletonTable({ rows = 6 }: { rows?: number }) {
  return (
    <div className="rounded-md border border-border">
      <div className="px-4">
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border bg-card p-6 flex flex-col gap-4 shadow-sm">
      <Skeleton className="h-5 w-1/3" />
      <SkeletonText lines={3} />
    </div>
  );
}

export function SkeletonKanban({ columns = 4 }: { columns?: number }) {
  return (
    <div className="grid grid-flow-col auto-cols-[minmax(260px,1fr)] gap-3 overflow-x-auto pb-4">
      {Array.from({ length: columns }).map((_, c) => (
        <div
          key={c}
          className="flex flex-col gap-2 rounded-md border border-border p-3 bg-card"
        >
          <div className="flex items-baseline justify-between gap-2 pb-1">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3 w-6" />
          </div>
          {Array.from({ length: 3 }).map((_, r) => (
            <div
              key={r}
              className="rounded-md border border-border bg-background p-3 flex flex-col gap-2"
            >
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
