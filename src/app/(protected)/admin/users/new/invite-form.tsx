"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inviteUser, type InviteUserState } from "./actions";

const ALL_ROLES = ["super_user", "admin_grupo", "admin_pilar", "member"] as const;
type RoleValue = (typeof ALL_ROLES)[number];

const ALL_SKILLS = ["crm", "ops", "docs", "finance", "admin"] as const;

type Pillar = { id: string; name: string };

type Props = {
  pillars: Pillar[];
  actorIsSuperUser: boolean;
};

const initialState: InviteUserState = {};

const ROLE_DEFAULT_SKILLS: Record<RoleValue, string[]> = {
  super_user: ["crm", "ops", "docs", "finance", "admin"],
  admin_grupo: ["crm", "ops", "docs", "admin"],
  admin_pilar: ["crm", "ops", "docs"],
  member: ["crm", "ops", "docs"],
};

export function InviteUserForm({ pillars, actorIsSuperUser }: Props) {
  const t = useTranslations("admin.invite");
  const tRoles = useTranslations("roles");
  const tSkills = useTranslations("admin.skills");
  const tCommon = useTranslations("common");
  const tUsers = useTranslations("admin.users");

  const [state, formAction, pending] = useActionState(inviteUser, initialState);
  const [role, setRole] = useState<RoleValue>("member");
  const [skills, setSkills] = useState<string[]>(ROLE_DEFAULT_SKILLS.member);

  const availableRoles = ALL_ROLES.filter((r) => {
    if (r === "super_user" && !actorIsSuperUser) return false;
    return true;
  });

  const fieldError = (name: string) =>
    state?.fieldErrors?.[name] ? (
      <p className="text-sm text-destructive mt-1">
        {state.fieldErrors[name]}
      </p>
    ) : null;

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">
            {t("email")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="off"
          />
          {fieldError("email")}
        </div>

        <div className="space-y-2">
          <Label htmlFor="fullName">{t("fullName")}</Label>
          <Input id="fullName" name="fullName" autoComplete="off" />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="role">{t("role")}</Label>
          <select
            id="role"
            name="role"
            value={role}
            onChange={(e) => {
              const next = e.target.value as RoleValue;
              setRole(next);
              setSkills(ROLE_DEFAULT_SKILLS[next]);
            }}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
          >
            {availableRoles.map((r) => (
              <option key={r} value={r}>
                {tRoles(r)}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">{tUsers("roleHint")}</p>
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">
          {tSkills("legend")}
        </legend>
        <p className="text-xs text-muted-foreground">{tSkills("hint")}</p>
        <div className="grid sm:grid-cols-2 gap-2 mt-2">
          {ALL_SKILLS.map((s) => (
            <label
              key={s}
              className="flex items-start gap-2 text-sm text-foreground border border-border rounded-md px-3 py-2 cursor-pointer hover:bg-muted/30 transition-colors"
            >
              <input
                type="checkbox"
                name="skills"
                value={s}
                checked={skills.includes(s)}
                onChange={(e) => {
                  setSkills((cur) =>
                    e.target.checked
                      ? [...cur, s]
                      : cur.filter((x) => x !== s),
                  );
                }}
                className="mt-0.5 h-4 w-4 rounded border-input shrink-0"
              />
              <div className="flex-1">
                <div className="font-medium">{tSkills(`labels.${s}`)}</div>
                <div className="text-xs text-muted-foreground">
                  {tSkills(`descriptions.${s}`)}
                </div>
              </div>
            </label>
          ))}
        </div>
        {role === "super_user" && (
          <p className="text-xs text-accent-foreground italic mt-2">
            {tSkills("superUserNote")}
          </p>
        )}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">
          {tUsers("pillarAccess")}
        </legend>
        <p className="text-xs text-muted-foreground">
          {tUsers("pillarAccessHint")}
        </p>
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
                className="h-4 w-4 rounded border-input"
              />
              {p.name}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="defaultPillarId">{tUsers("defaultPillar")}</Label>
        <select
          id="defaultPillarId"
          name="defaultPillarId"
          defaultValue=""
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
        >
          <option value="">{tUsers("noDefault")}</option>
          {pillars.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-start gap-2 text-sm text-foreground border border-border rounded-md px-3 py-3 cursor-pointer hover:bg-muted/30 transition-colors">
        <input
          type="checkbox"
          name="sendInvite"
          defaultChecked
          className="mt-0.5 h-4 w-4 rounded border-input shrink-0"
        />
        <div>
          <div className="font-medium">{t("sendInvite")}</div>
          <div className="text-xs text-muted-foreground">
            {t("sendInviteHint")}
          </div>
        </div>
      </label>

      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? t("creating") : t("create")}
        </Button>
        <Button asChild variant="ghost">
          <Link href="/admin/users">{tCommon("cancel")}</Link>
        </Button>
      </div>
    </form>
  );
}
