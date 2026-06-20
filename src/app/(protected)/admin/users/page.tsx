import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { getAllPillars, getAllProfiles, requireRole } from "@/lib/dal";

export default async function AdminUsersPage() {
  await requireRole("admin_grupo");
  const t = await getTranslations("admin.users");
  const tRoles = await getTranslations("roles");

  const [users, pillars] = await Promise.all([
    getAllProfiles(),
    getAllPillars(),
  ]);

  const pillarById = new Map(pillars.map((p) => [p.id, p]));

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-10 py-10 space-y-8">
      <div>
        <h1 className="font-display text-6xl text-foreground leading-none">
          {t("title")}
        </h1>
        <p className="mt-2 text-base text-muted-foreground">{t("subtitle")}</p>
      </div>

      <p className="text-sm text-muted-foreground">
        {t("count", { count: users.length })}
      </p>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                  {t("table.name")}
                </th>
                <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                  {t("table.email")}
                </th>
                <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                  {t("table.role")}
                </th>
                <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">
                  {t("table.pillarAccess")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => {
                const accessNames = u.pillarAccess ?? [];
                return (
                  <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-0">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="block px-0 py-3 font-medium text-foreground"
                      >
                        {u.fullName ?? "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="block py-3 -my-3"
                      >
                        {u.email}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="inline-flex items-center rounded-full bg-accent/40 px-2 py-0.5 text-xs text-foreground"
                      >
                        {tRoles(u.role as never)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="block py-3 -my-3"
                      >
                        {u.role === "admin_grupo"
                          ? t("allPillars")
                          : accessNames.length === 0
                          ? "—"
                          : accessNames
                              .map((id: string) => pillarById.get(id)?.name ?? id)
                              .join(", ")}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
