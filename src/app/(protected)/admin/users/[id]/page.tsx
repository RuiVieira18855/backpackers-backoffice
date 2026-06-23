import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { getAllPillars, requireRole } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import { UserForm } from "./user-form";

type Props = { params: Promise<{ id: string }> };

export default async function AdminUserDetailPage({ params }: Props) {
  // admin_grupo OR super_user can open this (requireRole accepts super_user)
  const actor = await requireRole("admin_grupo");
  const { id } = await params;
  const t = await getTranslations("admin.users");

  const user = await db.query.profiles.findFirst({
    where: eq(profiles.id, id),
  });

  if (!user) notFound();

  const pillars = await getAllPillars();

  return (
    <div className="max-w-4xl mx-auto px-6 md:px-10 py-10 space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
          <Link href="/admin/users">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("backToList")}
          </Link>
        </Button>
        <h1 className="font-display text-5xl text-foreground leading-none">
          {user.fullName ?? user.email}
        </h1>
      </div>

      <UserForm
        id={user.id}
        email={user.email}
        fullName={user.fullName}
        role={user.role}
        skills={(user.skills ?? []) as string[]}
        pillarAccess={user.pillarAccess}
        defaultPillarId={user.defaultPillarId}
        pillars={pillars.map((p) => ({ id: p.id, name: p.name }))}
        isSelf={user.id === actor.id}
        actorIsSuperUser={actor.role === "super_user"}
        targetIsSuperUser={user.role === "super_user"}
      />
    </div>
  );
}
