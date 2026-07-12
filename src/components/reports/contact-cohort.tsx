import { getTranslations } from "next-intl/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type CohortRow = {
  month: string;
  total: number;
  active: number;
  won: number;
  lost: number;
};

export async function ContactCohort({ rows }: { rows: CohortRow[] }) {
  const t = await getTranslations("reports.cohort");
  if (rows.length === 0) return null;

  function pct(n: number, total: number): string {
    if (total <= 0) return "—";
    return `${Math.round((n / total) * 100)}%`;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <CardDescription>{t("hint")}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                  {t("col.cohort")}
                </th>
                <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground text-right">
                  {t("col.total")}
                </th>
                <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground text-right">
                  {t("col.active")}
                </th>
                <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground text-right">
                  {t("col.won")}
                </th>
                <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground text-right">
                  {t("col.wonPct")}
                </th>
                <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground text-right">
                  {t("col.lostPct")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.month} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground tabular-nums">
                    {r.month}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
                    {r.total}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
                    {r.active}
                  </td>
                  <td className="px-4 py-3 text-right text-foreground tabular-nums">
                    {r.won}
                  </td>
                  <td className="px-4 py-3 text-right text-foreground tabular-nums">
                    {pct(r.won, r.total)}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
                    {pct(r.lost, r.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
