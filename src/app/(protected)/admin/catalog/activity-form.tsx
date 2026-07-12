"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createCatalogActivity,
  updateCatalogActivity,
  type CatalogState,
} from "./actions";

type Pillar = { id: string; name: string };

export type CatalogActivityFormValues = {
  id?: string;
  code: string;
  name: string;
  tagline: string | null;
  family: "wild" | "hive" | "multi";
  pillarId: string | null;
  durationLabel: string | null;
  paxMin: number | null;
  paxMax: number | null;
  priceTargetMin: number | null;
  priceTargetMax: number | null;
  pricePerPaxMin: number | null;
  pricePerPaxMax: number | null;
  targetAudience: string | null;
  body: string;
  sortOrder: number;
};

export function CatalogActivityForm({
  activity,
  pillars,
}: {
  activity?: CatalogActivityFormValues;
  pillars: Pillar[];
}) {
  const t = useTranslations("admin.catalog.form");
  const tCommon = useTranslations("common");

  const isEdit = Boolean(activity?.id);
  const action = isEdit
    ? updateCatalogActivity.bind(null, activity!.id!)
    : createCatalogActivity;

  const [state, formAction, pending] = useActionState<
    CatalogState | undefined,
    FormData
  >(action, undefined);

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="code">{t("code")}</Label>
              <Input
                id="code"
                name="code"
                required
                defaultValue={activity?.code ?? ""}
                placeholder="wild-01-treasure-hunters"
                aria-invalid={Boolean(state?.fieldErrors?.code)}
              />
              {state?.fieldErrors?.code && (
                <p className="text-xs text-destructive">
                  {state.fieldErrors.code}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="family">{t("family")}</Label>
              <select
                id="family"
                name="family"
                required
                defaultValue={activity?.family ?? "wild"}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="wild">🌿 Wild (outdoor)</option>
                <option value="hive">🏢 Hive (indoor)</option>
                <option value="multi">🌄 Multi-dia</option>
              </select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="name">{t("name")}</Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={activity?.name ?? ""}
              placeholder="Treasure Hunters"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tagline">{t("tagline")}</Label>
            <Input
              id="tagline"
              name="tagline"
              defaultValue={activity?.tagline ?? ""}
              placeholder="Uma caça ao tesouro em terreno real."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="pillarId">{t("pillar")}</Label>
              <select
                id="pillarId"
                name="pillarId"
                defaultValue={activity?.pillarId ?? ""}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">{t("noPillar")}</option>
                {pillars.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="durationLabel">{t("duration")}</Label>
              <Input
                id="durationLabel"
                name="durationLabel"
                defaultValue={activity?.durationLabel ?? ""}
                placeholder="meio-dia (3-4h)"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="paxMin">{t("paxMin")}</Label>
              <Input
                id="paxMin"
                name="paxMin"
                type="number"
                min={1}
                defaultValue={activity?.paxMin ?? ""}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="paxMax">{t("paxMax")}</Label>
              <Input
                id="paxMax"
                name="paxMax"
                type="number"
                min={1}
                defaultValue={activity?.paxMax ?? ""}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="pricePerPaxMin">{t("pricePerPaxMin")}</Label>
              <Input
                id="pricePerPaxMin"
                name="pricePerPaxMin"
                type="number"
                min={0}
                defaultValue={activity?.pricePerPaxMin ?? ""}
                placeholder="35"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pricePerPaxMax">{t("pricePerPaxMax")}</Label>
              <Input
                id="pricePerPaxMax"
                name="pricePerPaxMax"
                type="number"
                min={0}
                defaultValue={activity?.pricePerPaxMax ?? ""}
                placeholder="40"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="priceTargetMin">{t("priceTargetMin")}</Label>
              <Input
                id="priceTargetMin"
                name="priceTargetMin"
                type="number"
                min={0}
                defaultValue={activity?.priceTargetMin ?? ""}
                placeholder="515"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="priceTargetMax">{t("priceTargetMax")}</Label>
              <Input
                id="priceTargetMax"
                name="priceTargetMax"
                type="number"
                min={0}
                defaultValue={activity?.priceTargetMax ?? ""}
                placeholder="620"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="targetAudience">{t("targetAudience")}</Label>
            <Input
              id="targetAudience"
              name="targetAudience"
              defaultValue={activity?.targetAudience ?? ""}
              placeholder="Equipa de vendas, comercial, operações"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="sortOrder">{t("sortOrder")}</Label>
            <Input
              id="sortOrder"
              name="sortOrder"
              type="number"
              defaultValue={activity?.sortOrder ?? 0}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-3">
          <Label htmlFor="body">{t("body")}</Label>
          <p className="text-xs text-muted-foreground">{t("bodyHint")}</p>
          <textarea
            id="body"
            name="body"
            defaultValue={activity?.body ?? ""}
            rows={20}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono leading-relaxed"
            placeholder="# Objectivo pedagógico&#10;...&#10;&#10;## Equipamento&#10;..."
          />
        </CardContent>
      </Card>

      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <div className="flex items-center justify-end gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? tCommon("saving") : tCommon("save")}
        </Button>
      </div>
    </form>
  );
}
