"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitBooking, type BookingState } from "./actions";

const TYPES = [
  { value: "tour", label: "Tour" },
  { value: "team_building", label: "Team building" },
  { value: "workshop", label: "Workshop" },
  { value: "meeting", label: "Reunião" },
  { value: "retreat", label: "Retreat" },
  { value: "other", label: "Outro" },
];

type Pillar = { slug: string; name: string };

const initialState: BookingState = {};

export function BookingForm({ pillars }: { pillars: Pillar[] }) {
  const [state, formAction, pending] = useActionState(
    submitBooking,
    initialState,
  );

  if (state?.ok) {
    return (
      <div className="rounded-md border border-border bg-card p-8 text-center space-y-3">
        <h2 className="font-display text-3xl">Pedido recebido</h2>
        <p className="text-muted-foreground">
          Vamos voltar a contactar-te por e-mail nas próximas 24h úteis.
        </p>
        {state.reference && (
          <p className="text-xs text-muted-foreground italic mt-2">
            Referência: <span className="font-mono">{state.reference}</span>
          </p>
        )}
      </div>
    );
  }

  const fieldError = (name: string) =>
    state?.fieldErrors?.[name] ? (
      <p className="text-sm text-destructive mt-1">
        {state.fieldErrors[name]}
      </p>
    ) : null;

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="fullName">
            Nome <span className="text-destructive">*</span>
          </Label>
          <Input id="fullName" name="fullName" required autoComplete="name" />
          {fieldError("fullName")}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">
            E-mail <span className="text-destructive">*</span>
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
          />
          {fieldError("email")}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Telefone</Label>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pillarSlug">
            Marca <span className="text-destructive">*</span>
          </Label>
          <select
            id="pillarSlug"
            name="pillarSlug"
            required
            defaultValue=""
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
          >
            <option value="" disabled>
              Escolhe…
            </option>
            {pillars.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">
            Tipo de pedido <span className="text-destructive">*</span>
          </Label>
          <select
            id="type"
            name="type"
            required
            defaultValue="tour"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
          >
            {TYPES.map((tp) => (
              <option key={tp.value} value={tp.value}>
                {tp.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="preferredDate">
            Data preferida <span className="text-destructive">*</span>
          </Label>
          <Input
            id="preferredDate"
            name="preferredDate"
            type="date"
            required
          />
          {fieldError("preferredDate")}
        </div>

        <div className="space-y-2">
          <Label htmlFor="partySize">Nº de pessoas</Label>
          <Input
            id="partySize"
            name="partySize"
            type="number"
            min={1}
            defaultValue={1}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notes">Notas adicionais</Label>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs"
            placeholder="Conta-nos mais sobre o que procuras."
          />
        </div>
      </div>

      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending} size="lg">
          {pending ? "A enviar…" : "Enviar pedido"}
        </Button>
      </div>
    </form>
  );
}
