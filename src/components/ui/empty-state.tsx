import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  secondary?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondary,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card/40 px-6 py-12 text-center",
        className,
      )}
    >
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
      )}
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground max-w-md">
            {description}
          </p>
        )}
      </div>
      {(action || secondary) && (
        <div className="flex items-center gap-2 pt-2">
          {action &&
            (action.href ? (
              <Button asChild size="sm">
                <Link href={action.href}>{action.label}</Link>
              </Button>
            ) : (
              <Button size="sm" onClick={action.onClick}>
                {action.label}
              </Button>
            ))}
          {secondary &&
            (secondary.href ? (
              <Button asChild size="sm" variant="outline">
                <Link href={secondary.href}>{secondary.label}</Link>
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={secondary.onClick}>
                {secondary.label}
              </Button>
            ))}
        </div>
      )}
    </div>
  );
}
