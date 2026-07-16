import Link from "next/link";
import { ChevronLeft, Zap, Users, TrendingUp, AlertTriangle } from "lucide-react";
import { sql } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { costEur, formatEur, priceForModel } from "@/lib/ai/pricing";

type DailyRow = { day: string; generations: number; input_tokens: number; output_tokens: number };
type ModelRow = { model: string; app: string; generations: number; input_tokens: number; output_tokens: number };
type UserRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  kind: string | null;
  generations: number;
  input_tokens: number;
  output_tokens: number;
  models: string[];
};

// Cairn Pro price for margin comparison (per handoff: €7/month or €70/year).
const CAIRN_PRO_MONTHLY_EUR = 7;
// Alert threshold: 40% of margin already eaten by AI cost.
const ALERT_THRESHOLD_EUR = CAIRN_PRO_MONTHLY_EUR * 0.4;

export default async function AiAnalyticsPage() {
  await requireRole("admin_grupo");
  const t = await getTranslations("admin.analytics");

  // Warm the pooler once before parallel queries
  await db.execute(sql`SELECT 1`).catch(() => undefined);

  const [dailyRes, byModelRes, byUserRes, totalsRes] = await Promise.all([
    db.execute(sql`
      SELECT
        to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
        count(*)::int AS generations,
        coalesce(sum(input_tokens),0)::bigint AS input_tokens,
        coalesce(sum(output_tokens),0)::bigint AS output_tokens
      FROM public.ai_usage
      WHERE created_at > now() - interval '30 days'
      GROUP BY 1
      ORDER BY 1
    `),
    db.execute(sql`
      SELECT
        coalesce(model, 'unknown') AS model,
        coalesce(app, 'outpost')  AS app,
        count(*)::int              AS generations,
        coalesce(sum(input_tokens),0)::bigint  AS input_tokens,
        coalesce(sum(output_tokens),0)::bigint AS output_tokens
      FROM public.ai_usage
      WHERE created_at > now() - interval '30 days'
      GROUP BY model, app
      ORDER BY generations DESC
    `),
    db.execute(sql`
      SELECT
        u.user_id,
        p.email,
        p.full_name,
        p.kind,
        count(*)::int AS generations,
        coalesce(sum(u.input_tokens),0)::bigint  AS input_tokens,
        coalesce(sum(u.output_tokens),0)::bigint AS output_tokens,
        array_agg(distinct u.model) AS models
      FROM public.ai_usage u
      LEFT JOIN public.profiles p ON p.id = u.user_id
      WHERE u.created_at > now() - interval '30 days'
      GROUP BY u.user_id, p.email, p.full_name, p.kind
      ORDER BY generations DESC
      LIMIT 20
    `),
    db.execute(sql`
      SELECT
        count(*)::int AS gens_30d,
        (SELECT count(*)::int FROM public.ai_usage WHERE created_at > now() - interval '7 days') AS gens_7d,
        (SELECT count(distinct user_id)::int FROM public.ai_usage WHERE created_at > now() - interval '30 days') AS users_30d,
        (SELECT count(*)::int FROM public.profiles) AS total_users,
        (SELECT count(*)::int FROM public.profiles WHERE created_at > now() - interval '30 days') AS new_users_30d,
        (SELECT count(*)::int FROM public.profiles WHERE created_at > now() - interval '7 days') AS new_users_7d,
        (SELECT count(*)::int FROM public.app_access WHERE status = 'active') AS active_access,
        (SELECT count(*)::int FROM public.app_access WHERE status = 'trial') AS trial_access
      FROM public.ai_usage
      WHERE created_at > now() - interval '30 days'
    `),
  ]);

  const daily = toRows<DailyRow>(dailyRes);
  const byModel = toRows<ModelRow>(byModelRes);
  const byUser = toRows<UserRow>(byUserRes);
  const totals = toRows<{
    gens_30d: number;
    gens_7d: number;
    users_30d: number;
    total_users: number;
    new_users_30d: number;
    new_users_7d: number;
    active_access: number;
    trial_access: number;
  }>(totalsRes)[0] ?? {
    gens_30d: 0, gens_7d: 0, users_30d: 0, total_users: 0,
    new_users_30d: 0, new_users_7d: 0, active_access: 0, trial_access: 0,
  };

  // Total cost 30d
  const totalCost30d = byModel.reduce(
    (acc, r) => acc + costEur(r.model, Number(r.input_tokens), Number(r.output_tokens)),
    0,
  );

  // Per user cost
  const usersWithCost = byUser.map((u) => {
    let cost = 0;
    // Approximate: distribute tokens across each model used, weighted equally
    // Better: aggregate ai_usage GROUP BY user_id, model. Simplified here.
    const models = Array.isArray(u.models) ? u.models : [];
    const perModelTokens = models.length > 0
      ? { input: Number(u.input_tokens) / models.length, output: Number(u.output_tokens) / models.length }
      : { input: Number(u.input_tokens), output: Number(u.output_tokens) };
    for (const m of models.length > 0 ? models : ["unknown"]) {
      cost += costEur(m ?? "unknown", perModelTokens.input, perModelTokens.output);
    }
    return { ...u, cost };
  });

  // Chart bounds
  const maxDaily = Math.max(1, ...daily.map((d) => d.generations));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
          <Link href="/admin">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("backToAdmin")}
          </Link>
        </Button>
        <h1 className="font-display text-4xl sm:text-6xl text-foreground leading-none">
          {t("title")}
        </h1>
        <p className="mt-2 text-base text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* ------------ KPIs ------------ */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={<Zap className="h-4 w-4" />}
          label={t("kpi.gens30d")}
          value={totals.gens_30d.toLocaleString("pt-PT")}
          sub={t("kpi.gens7d", { n: totals.gens_7d.toLocaleString("pt-PT") })}
        />
        <Kpi
          icon={<Users className="h-4 w-4" />}
          label={t("kpi.usersTotal")}
          value={totals.total_users.toLocaleString("pt-PT")}
          sub={t("kpi.usersNew", {
            m: totals.new_users_30d,
            w: totals.new_users_7d,
          })}
        />
        <Kpi
          icon={<TrendingUp className="h-4 w-4" />}
          label={t("kpi.activeAccess")}
          value={totals.active_access.toLocaleString("pt-PT")}
          sub={t("kpi.trialAccess", { n: totals.trial_access })}
        />
        <Kpi
          icon={<Zap className="h-4 w-4" />}
          label={t("kpi.cost30d")}
          value={formatEur(totalCost30d)}
          sub={t("kpi.perGeneration", {
            v: totals.gens_30d > 0
              ? formatEur(totalCost30d / totals.gens_30d)
              : "—",
          })}
          accent
        />
      </section>

      {/* ------------ Daily chart ------------ */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <h2 className="font-display text-2xl text-foreground">
              {t("dailyChart.title")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("dailyChart.subtitle")}
            </p>
          </div>
          {daily.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              {t("dailyChart.empty")}
            </p>
          ) : (
            <div className="flex items-end gap-1 h-40">
              {daily.map((d) => {
                const h = Math.max(4, (d.generations / maxDaily) * 100);
                return (
                  <div
                    key={d.day}
                    className="flex-1 flex flex-col items-center gap-1 group"
                    title={`${d.day} · ${d.generations} gerações`}
                  >
                    <div
                      className="w-full bg-accent/40 group-hover:bg-accent transition-colors rounded-sm"
                      style={{ height: `${h}%` }}
                    />
                  </div>
                );
              })}
            </div>
          )}
          {daily.length > 0 && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{daily[0].day}</span>
              <span>{daily[daily.length - 1].day}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ------------ Cost by model ------------ */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="font-display text-2xl text-foreground">
            {t("byModel.title")}
          </h2>
          {byModel.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              {t("byModel.empty")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/30">
                  <tr className="text-left">
                    <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
                      {t("byModel.col.model")}
                    </th>
                    <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
                      {t("byModel.col.app")}
                    </th>
                    <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground text-right">
                      {t("byModel.col.gens")}
                    </th>
                    <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground text-right">
                      {t("byModel.col.tokens")}
                    </th>
                    <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground text-right">
                      {t("byModel.col.cost")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {byModel.map((m, i) => {
                    const cost = costEur(m.model, Number(m.input_tokens), Number(m.output_tokens));
                    return (
                      <tr key={i} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono text-xs">{m.model}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                            m.app === "cairn" ? "bg-accent/40" : "bg-muted"
                          }`}>
                            {m.app}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{m.generations.toLocaleString("pt-PT")}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                          {(Number(m.input_tokens) + Number(m.output_tokens)).toLocaleString("pt-PT")}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium">{formatEur(cost)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ------------ Top users ------------ */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <h2 className="font-display text-2xl text-foreground">
              {t("topUsers.title")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("topUsers.subtitle", { threshold: formatEur(ALERT_THRESHOLD_EUR) })}
            </p>
          </div>
          {usersWithCost.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              {t("topUsers.empty")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/30">
                  <tr className="text-left">
                    <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
                      {t("topUsers.col.user")}
                    </th>
                    <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
                      {t("topUsers.col.kind")}
                    </th>
                    <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground text-right">
                      {t("topUsers.col.gens")}
                    </th>
                    <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground text-right">
                      {t("topUsers.col.tokens")}
                    </th>
                    <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground text-right">
                      {t("topUsers.col.cost")}
                    </th>
                    <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
                      {t("topUsers.col.margin")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {usersWithCost.map((u) => {
                    const isRisk = u.cost >= ALERT_THRESHOLD_EUR;
                    const marginPct = Math.min(100, Math.round((u.cost / CAIRN_PRO_MONTHLY_EUR) * 100));
                    return (
                      <tr key={u.user_id} className={isRisk ? "bg-destructive/5" : "hover:bg-muted/30"}>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-foreground font-medium text-sm">
                              {u.full_name ?? u.email ?? u.user_id.slice(0, 8)}
                            </span>
                            {u.email && u.full_name && (
                              <span className="text-xs text-muted-foreground">{u.email}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{u.kind ?? "—"}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{u.generations.toLocaleString("pt-PT")}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                          {(Number(u.input_tokens) + Number(u.output_tokens)).toLocaleString("pt-PT")}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium">{formatEur(u.cost)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-24">
                              <div
                                className={`h-full ${isRisk ? "bg-destructive" : "bg-accent"}`}
                                style={{ width: `${marginPct}%` }}
                              />
                            </div>
                            <span className="text-xs tabular-nums text-muted-foreground">{marginPct}%</span>
                            {isRisk && <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-muted-foreground italic">
            {t("topUsers.disclaimer", { plan: formatEur(CAIRN_PRO_MONTHLY_EUR) })}
          </p>
        </CardContent>
      </Card>

      {/* ------------ Reference pricing ------------ */}
      <Card>
        <CardContent className="p-6 space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t("pricing.title")}
          </h3>
          <div className="grid gap-2 sm:grid-cols-3 text-xs text-muted-foreground">
            {[
              ["claude-haiku-4-5", priceForModel("claude-haiku-4-5")],
              ["claude-sonnet-4-6", priceForModel("claude-sonnet-4-6")],
              ["claude-opus-4-8", priceForModel("claude-opus-4-8")],
            ].map(([name, p]) => {
              const price = p as { inputUsd: number; outputUsd: number };
              return (
                <div key={name as string} className="flex justify-between">
                  <span className="font-mono">{name as string}</span>
                  <span>${price.inputUsd} / ${price.outputUsd} per 1M</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground italic">{t("pricing.note")}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  sub,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <Card className={accent ? "border-accent/40 bg-accent/5" : ""}>
      <CardContent className="p-5 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
          <span className="text-muted-foreground">{icon}</span>
        </div>
        <p className="font-display text-3xl text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

function toRows<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  if (res && typeof res === "object" && "rows" in res && Array.isArray((res as { rows: unknown[] }).rows)) {
    return (res as { rows: T[] }).rows;
  }
  return [] as T[];
}
