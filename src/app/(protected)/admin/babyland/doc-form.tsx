"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { CollectionDef } from "@/lib/babyland/collections";
import { saveBabylandDoc, type BabylandState } from "./actions";

export function DocForm({
  colKey,
  def,
  doc,
}: {
  colKey: string;
  def: CollectionDef;
  doc: (Record<string, unknown> & { id: string }) | null;
}) {
  const action = saveBabylandDoc.bind(null, colKey, doc?.id ?? null);
  const [state, formAction, pending] = useActionState<
    BabylandState | undefined,
    FormData
  >(action, undefined);

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        {def.fields.map((f) => {
          const value = doc?.[f.name];
          const err = state?.fieldErrors?.[f.name];
          const wide = f.type === "textarea";
          return (
            <div key={f.name} className={wide ? "sm:col-span-2" : ""}>
              <Label htmlFor={f.name}>
                {f.label}
                {f.required && <span className="text-destructive"> *</span>}
              </Label>

              {f.type === "textarea" ? (
                <textarea
                  id={f.name}
                  name={f.name}
                  defaultValue={String(value ?? "")}
                  rows={6}
                  className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              ) : f.type === "select" ? (
                <select
                  id={f.name}
                  name={f.name}
                  defaultValue={String(value ?? "")}
                  className="mt-1.5 h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                >
                  <option value="">—</option>
                  {f.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : f.type === "boolean" ? (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    id={f.name}
                    name={f.name}
                    type="checkbox"
                    defaultChecked={Boolean(value)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm text-muted-foreground">
                    {f.help ?? "Sim"}
                  </span>
                </div>
              ) : (
                <Input
                  id={f.name}
                  name={f.name}
                  type={
                    f.type === "number"
                      ? "number"
                      : f.type === "date"
                        ? "date"
                        : "text"
                  }
                  step={f.type === "number" ? "any" : undefined}
                  defaultValue={String(value ?? "")}
                  placeholder={f.placeholder}
                  className="mt-1.5"
                />
              )}

              {f.help && f.type !== "boolean" && (
                <p className="mt-1 text-xs text-muted-foreground">{f.help}</p>
              )}
              {err && <p className="mt-1 text-xs text-destructive">{err}</p>}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "A gravar..." : "Gravar"}
        </Button>
        <Button asChild variant="ghost">
          <Link href={`/admin/babyland/${colKey}`}>Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
