"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type MonthlyPoint = {
  month: string;
  income: number;
  expense: number;
  net: number;
};

type Props = {
  data: MonthlyPoint[];
  labels: {
    income: string;
    expense: string;
    net: string;
  };
};

const EUR = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function MonthlyCashflow({ data, labels }: Props) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
          />
          <YAxis
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            tickFormatter={(v) => EUR.format(Number(v))}
            width={84}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              fontSize: 12,
              padding: "6px 8px",
            }}
            labelStyle={{ color: "var(--muted-foreground)" }}
            formatter={(value, name) => [
              EUR.format(Number(value ?? 0)),
              String(name ?? ""),
            ]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="income" name={labels.income} fill="#A8E6E2" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expense" name={labels.expense} fill="#0E2A44" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
