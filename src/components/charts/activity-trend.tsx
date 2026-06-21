"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type TrendPoint = { day: string; count: number };

type Props = {
  data: TrendPoint[];
  color?: string;
  label: string;
};

/**
 * Compact sparkline-style area chart for KPI cards.
 * `data` is an array of { day: "YYYY-MM-DD", count: N } for the last N days.
 */
export function ActivityTrend({ data, color = "#A8E6E2", label }: Props) {
  return (
    <div className="h-16 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`gradient-${label}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.5} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="day" hide />
          <YAxis hide />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              fontSize: 12,
              padding: "4px 8px",
            }}
            labelStyle={{ color: "var(--muted-foreground)" }}
            itemStyle={{ color: "var(--foreground)" }}
            cursor={{ stroke: color, strokeOpacity: 0.3 }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke={color}
            strokeWidth={2}
            fill={`url(#gradient-${label})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
