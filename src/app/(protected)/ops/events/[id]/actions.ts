"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { requireRole } from "@/lib/dal";
import { logAudit } from "@/lib/audit";
import type { EventFormState } from "@/components/events/event-form";

const TYPES = ["tour", "team_building", "workshop", "meeting", "retreat", "other"] as const;
const STATUSES = ["draft", "scheduled", "in_progress", "completed", "cancelled"] as const;

const schema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  pillarId: z.string().uuid(),
  type: z.enum(TYPES),
  status: z.enum(STATUSES),
  description: z.string().optional(),
  location: z.string().optional(),
  startAt: z.date().nullable(),
  endAt: z.date().nullable(),
  capacity: z.number().int().nonnegative().nullable(),
  clientContactId: z.string().uuid().nullable(),
  notes: z.string().optional(),
});

function parseDatetimeLocal(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export async function updateEvent(
  _prev: EventFormState | undefined,
  formData: FormData,
): Promise<EventFormState> {
  const profile = await requireRole("admin_grupo", "admin_pilar");
  const tErrors = await getTranslations("ops.form.errors");

  const raw = {
    id: String(formData.get("id") ?? ""),
    name: String(formData.get("name") ?? "").trim(),
    pillarId: String(formData.get("pillarId") ?? ""),
    type: formData.get("type") as string,
    status: formData.get("status") as string,
    description: String(formData.get("description") ?? "").trim(),
    location: String(formData.get("location") ?? "").trim(),
    startAt: parseDatetimeLocal(String(formData.get("startAt") ?? "")),
    endAt: parseDatetimeLocal(String(formData.get("endAt") ?? "")),
    capacity: ((): number | null => {
      const v = String(formData.get("capacity") ?? "").trim();
      if (!v) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    })(),
    clientContactId:
      String(formData.get("clientContactId") ?? "") || null,
    notes: String(formData.get("notes") ?? "").trim(),
  };

  if (!raw.name) {
    return { fieldErrors: { name: tErrors("nameRequired") } };
  }
  if (!raw.pillarId) {
    return { fieldErrors: { pillarId: tErrors("pillarRequired") } };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const first = Object.entries(flat.fieldErrors)[0];
    return {
      error: first ? `${first[0]}: ${first[1]?.[0] ?? ""}` : "Invalid data",
    };
  }

  const before = await db.query.events.findFirst({
    where: eq(events.id, parsed.data.id),
  });
  if (!before) {
    return { error: "Evento não encontrado." };
  }

  const [updated] = await db
    .update(events)
    .set({
      name: parsed.data.name,
      pillarId: parsed.data.pillarId,
      type: parsed.data.type,
      status: parsed.data.status,
      description: parsed.data.description || null,
      location: parsed.data.location || null,
      startAt: parsed.data.startAt,
      endAt: parsed.data.endAt,
      capacity: parsed.data.capacity,
      clientContactId: parsed.data.clientContactId,
      notes: parsed.data.notes || null,
    })
    .where(eq(events.id, parsed.data.id))
    .returning();

  await logAudit({
    userId: profile.id,
    pillarId: updated.pillarId,
    entityType: "event",
    entityId: updated.id,
    action: "update",
    diff: { before, after: updated },
  });

  redirect(`/ops/events/${updated.id}`);
}

export async function deleteEvent(id: string): Promise<void> {
  const profile = await requireRole("admin_grupo", "admin_pilar");

  const before = await db.query.events.findFirst({
    where: eq(events.id, id),
  });
  if (!before) {
    redirect("/ops/events");
  }

  await db.delete(events).where(eq(events.id, id));

  await logAudit({
    userId: profile.id,
    pillarId: before.pillarId,
    entityType: "event",
    entityId: id,
    action: "delete",
    diff: { snapshot: before },
  });

  redirect("/ops/events");
}
