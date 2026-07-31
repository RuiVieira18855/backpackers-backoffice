"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Counts = {
  active: number;
  trial: number;
  expired: number;
  revoked: number;
  total: number;
};

type Labels = {
  inactive: string;
  active: string;
  trial: string;
  total: string;
};

// Whole card is a Client Component so the outer <Link> and the inner
// stop-propagation <a> can coexist without tripping the Next 16 RSC
// boundary check ("Event handlers cannot be passed to Client Component
// props") which fires when a Server Component tree is nested between
// two Client Components.
export function AppCard({
  appKey,
  name,
  description,
  isActive,
  url,
  counts,
  labels,
}: {
  appKey: string;
  name: string;
  description: string | null;
  isActive: boolean;
  url: string | null;
  counts: Counts;
  labels: Labels;
}) {
  return (
    <Link href={`/admin/apps/${appKey}`} className="group">
      <Card className="h-full transition-colors group-hover:border-accent">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-base flex items-center gap-2">
                {name}
                {!isActive && (
                  <span className="text-[10px] uppercase tracking-wider rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                    {labels.inactive}
                  </span>
                )}
              </CardTitle>
              <CardDescription>{description ?? appKey}</CardDescription>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <p className="text-foreground font-medium tabular-nums">
                {counts.active}
              </p>
              <p className="text-muted-foreground">{labels.active}</p>
            </div>
            <div>
              <p className="text-foreground font-medium tabular-nums">
                {counts.trial}
              </p>
              <p className="text-muted-foreground">{labels.trial}</p>
            </div>
            <div>
              <p className="text-foreground font-medium tabular-nums">
                {counts.total}
              </p>
              <p className="text-muted-foreground">{labels.total}</p>
            </div>
          </div>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="block mt-3 text-xs text-muted-foreground underline-offset-2 hover:underline truncate"
            >
              {url}
            </a>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
