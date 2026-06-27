"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { contacts, events, pillars } from "@/lib/db/schema";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createNotifications } from "@/lib/notifications";

export type BookingState = {
  ok?: boolean;
  reference?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
};

const TYPES = ["tour", "team_building", "workshop", "meeting", "retreat", "other"] as const;

const schema = z.object({
  pillarSlug: z.string().min(1),
  type: z.enum(TYPES),
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  preferredDate: z.string().min(8), // YYYY-MM-DD
  partySize: z.string().regex(/^\d+$/),
  notes: z.string().optional(),
});

/**
 * Public booking action. NOT gated — anyone with the form URL can call it.
 *
 * Security notes:
 * - Uses supabaseAdmin (service_role) because RLS would block anonymous
 *   writes. We validate rigorously and only allow inserting into contacts
 *   + events with a fixed shape (no client-controlled IDs, no extra fields).
 * - One contact + one event per submission. Both rate-limited indirectly by
 *   Vercel's serverless cold-start cap; if abused we add a CAPTCHA.
 */
export async function submitBooking(
  _prev: BookingState | undefined,
  formData: FormData,
): Promise<BookingState> {
  const raw = {
    pillarSlug: String(formData.get("pillarSlug") ?? "").trim(),
    type: formData.get("type") as string,
    fullName: String(formData.get("fullName") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    phone: String(formData.get("phone") ?? "").trim(),
    preferredDate: String(formData.get("preferredDate") ?? ""),
    partySize: String(formData.get("partySize") ?? "1"),
    notes: String(formData.get("notes") ?? "").trim(),
  };

  if (!raw.fullName) {
    return { fieldErrors: { fullName: "Nome obrigatório." } };
  }
  if (!raw.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(raw.email)) {
    return { fieldErrors: { email: "E-mail inválido." } };
  }
  if (!raw.preferredDate) {
    return { fieldErrors: { preferredDate: "Data preferida obrigatória." } };
  }
  if (!(TYPES as readonly string[]).includes(raw.type)) {
    return { fieldErrors: { type: "Tipo de pedido inválido." } };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Dados inválidos." };
  }

  const pillar = await db.query.pillars.findFirst({
    where: eq(pillars.slug, parsed.data.pillarSlug),
  });
  if (!pillar) {
    return { error: "Pilar desconhecido." };
  }

  // 1. Find or create contact by email within this pillar.
  // (Public-facing — we don't trust the actor; admin can dedup later.)
  let contactId: string;
  const existing = await db.query.contacts.findFirst({
    where: eq(contacts.email, parsed.data.email),
  });
  if (existing) {
    contactId = existing.id;
  } else {
    const { error: insertErr } = await supabaseAdmin
      .from("contacts")
      .insert({
        pillar_id: pillar.id,
        type: "lead",
        stage: "new",
        full_name: parsed.data.fullName,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        source: "website",
        notes: `[Booking público] ${parsed.data.notes || ""}`.trim(),
      })
      .select("id")
      .single();
    if (insertErr) {
      console.error("[book] contact insert failed:", insertErr);
      return { error: "Não foi possível criar o pedido. Tenta de novo." };
    }
    // Read back the new contact id.
    const fresh = await db.query.contacts.findFirst({
      where: eq(contacts.email, parsed.data.email),
    });
    if (!fresh) {
      return { error: "Não foi possível criar o pedido. Tenta de novo." };
    }
    contactId = fresh.id;
  }

  // 2. Create a draft event linked to the contact.
  const startAt = new Date(`${parsed.data.preferredDate}T10:00:00.000Z`);
  const endAt = new Date(startAt.getTime() + 90 * 60 * 1000);

  const { data: createdEvent, error: evErr } = await supabaseAdmin
    .from("events")
    .insert({
      pillar_id: pillar.id,
      type: parsed.data.type,
      status: "draft",
      name: `Pedido de ${parsed.data.fullName} — ${parsed.data.type}`,
      description: parsed.data.notes || null,
      capacity: Number(parsed.data.partySize),
      client_contact_id: contactId,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
    })
    .select("id")
    .single();

  if (evErr || !createdEvent) {
    console.error("[book] event insert failed:", evErr);
    return { error: "Não foi possível criar o pedido. Tenta de novo." };
  }

  // 3. Notify all admin_grupo + super_user (best-effort, no-op on failure).
  try {
    const { data: admins } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .in("role", ["admin_grupo", "super_user"]);
    if (admins && admins.length > 0) {
      await createNotifications(
        admins.map((a) => a.id),
        {
          kind: "system",
          title: `Novo pedido de booking: ${parsed.data.fullName}`,
          body: `${parsed.data.type} em ${parsed.data.preferredDate} · ${parsed.data.partySize} pessoa(s)`,
          link: `/ops/events/${createdEvent.id}`,
          pillarId: pillar.id,
        },
      );
    }
  } catch (err) {
    console.error("[book] admin notify failed:", err);
  }

  return {
    ok: true,
    reference: createdEvent.id,
  };
}
