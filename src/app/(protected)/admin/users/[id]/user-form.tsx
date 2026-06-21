"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { adminUpdateUser, type AdminUserState } from "./actions";

const ALL_ROLES = ["super_user", "admin_grupo", "admin_pilar", "member"] as const;
type RoleValue = (typeof ALL_ROLES)[number];

type Pillar = { id: string; name: string };

type Props = {
  id: string;
  email: string;
  fullName: string | null;
  role: RoleValue;
  pillarAccess: string[];
  defaultPillarId: string | null;
  pillars: Pillar[];
  isSelf: boolean;
  /** Logged-in user is super_user → may promote/demote super_user */
  actorIsSuperUser: boolean;
  /** Target user is super_user — locked for non-super_user actors */
  targetIsSuperUser: boolean;
};

const initialState: AdminUserState = {};

export function UserForm({
  id,
  email,
  fullName,
  role,
  pillarAccess,
  defaultPillarId,
  pillars,
  isSelf,
  actorIsSuperUser,
  targetIsSuperUser,
}: Props) {
  const t = useTranslations("admin.users");
  const tRoles = useTranslations("roles");
  const tCommon = useTranslations("common");

  const [state, formAction, pending] = useActionState(
    adminUpdateUser,
    initialState,
  );

  // Role options the actor is allowed to assign
  const availableRoles = ALL_ROLES.filter((r) => {
    if (r === "super_user" && !actorIsSuperUser) return false;
    return true;
  });

  const formDisabled = targetIsSuperUser && !actorIsSuperUser;

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      <input type="hidden" name="id" value={id} />

      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{t("email")}</p>
        <p className="text-foreground">{email}</p>
        <p className="text-sm text-muted-foreground mt-1">{fullName ?? "—"}</p>
        {isSelf && (
          <p className="text-xs text-accent-foreground italic mt-2">
            {t("isSelf")}
          </p>
        )}
        {formDisabled && (
          <p className="text-xs text-destructive mt-2">
            {t("targetSuperUserLocked")}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">{t("role")}</Label>
        <select
          id="role"
          name="role"
          defaultValue={role}
          disabled={formDisabled}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs disabled:opacity-50"
        >
          {availableRoles.map((r) => (
            <option key={r} value={r}>
              {tRoles(r)}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">{t("roleHint")}</p>
      </div>

      <fieldset className="space-y-2" disabled={formDisabled}>
        <legend className="text-sm font-medium text-foreground">
          {t("pillarAccess")}
        </legend>
        <p className="text-xs text-muted-foreground">{t("pillarAccessHint")}</p>
        <div className="space-y-2 mt-2">
          {pillars.map((p) => (
            <label
              key={p.id}
              className="flex items-center gap-2 text-sm text-foreground"
            >
              <input
                type="checkbox"
                name="pillarAccess"
                value={p.id}
                defaultChecked={pillarAccess.includes(p.id)}
                className="h-4 w-4 rounded border-input"
              />
              {p.name}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="defaultPillarId">{t("defaultPillar")}</Label>
        <select
          id="defaultPillarId"
          name="defaultPillarId"
          defaultValue={defaultPillarId ?? ""}
          disabled={formDisabled}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs disabled:opacity-50"
        >
          <option value="">{t("noDefault")}</option>
          {pillars.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending || formDisabled}>
          {pending ? tCommon("saving") : tCommon("save")}
        </Button>
        <Button asChild variant="ghost">
          <Link href="/admin/users">{tCommon("cancel")}</Link>
        </Button>
      </div>
    </form>
  );
}
