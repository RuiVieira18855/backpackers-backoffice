import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { pillars } from "@/lib/db/schema";
import { BookingForm } from "./booking-form";

export const metadata = {
  title: "Pedido de reserva — Backpackers",
  description:
    "Pede orçamento ou reserva para um evento Backpackers (Adventures, Synergy ou Labs).",
};

export default async function PublicBookingPage() {
  const allPillars = await db
    .select({ id: pillars.id, slug: pillars.slug, name: pillars.name })
    .from(pillars)
    .orderBy(asc(pillars.name));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <h1 className="font-display text-5xl leading-none">Backpackers</h1>
          <p className="mt-2 text-base text-muted-foreground">
            Pedido de reserva ou orçamento.
          </p>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        <BookingForm
          pillars={allPillars.map((p) => ({ slug: p.slug, name: p.name }))}
        />
        <p className="text-xs text-muted-foreground text-center">
          Os teus dados ficam na nossa base de leads e só são usados para
          responder ao teu pedido.
        </p>
      </main>
    </div>
  );
}
