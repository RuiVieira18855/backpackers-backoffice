"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { requireRole } from "@/lib/dal";
import { logAudit } from "@/lib/audit";
import {
  getCustomFieldDefs,
  parseCustomFieldsFromFormData,
} from "@/lib/custom-fields";
import { expandRecurrence } from "@/lib/recurrence";
import { pushEventToExternal } from "@/lib/oauth/sync";
import type { EventFormState } from "@/components/events/event-form";

const TYPES = ["tour", "team_building", "workshop", "meeting", "retreat", "other"] as const;
const STATUSES = ["draft", "scheduled", "in_progress", "completed", "cancelled"] as const;

const schema = z.object({
  name: z.string().min(1),
  pillarId: z.uuid(),
  type: z.enum(TYPES),
  status: z.enum(STATUSES),
  description: z.string().optional(),
  location: z.string().optional(),
  startAt: z.date().nullable(),
  endAt: z.date().nullable(),
  capacity: z.number().int().nonnegative().nullable(),
  clientContactId: z.uuid().nullable(),
  notes: z.string().optional(),
});

// NOTE: datetime-local inputs are TZ-naive; we parse them in server timezone.
// On Vercel (UTC) this can shift 1h vs Lisbon — acceptable for v1, fix later
// by capturing the user's TZ as a hidden field.
function parseDatetimeLocal(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export async function createEvent(
  _prev: EventFormState | undefined,
  formData: FormData,
): Promise<EventFormState> {
  const profile = await requireRole("admin_grupo", "admin_pilar");
  const tErrors = await getTranslations("ops.form.errors");

  const raw = {
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
    const flat = z.flattenError(parsed.error);
    const first = Object.entries(flat.fieldErrors)[0];
    return {
      error: first ? `${first[0]}: ${first[1]?.[0] ?? ""}` : "Invalid data",
    };
  }

  const customDefs = await getCustomFieldDefs("event");
  const customFields = parseCustomFieldsFromFormData(formData, customDefs);

  // Recurrence — read raw form fields (schema doesn't have them, they're
  // form-only). Applied only when startAt exists.
  const frequency = String(formData.get("recurrenceFrequency") ?? "none");
  const intervalRaw = Number(formData.get("recurrenceInterval") ?? "1");
  const recurrenceInterval =
    Number.isFinite(intervalRaw) && intervalRaw >= 1
      ? Math.min(12, Math.floor(intervalRaw))
      : 1;
  const recurrenceUntil =
    String(formData.get("recurrenceUntil") ?? "").trim() || null;
  const validFreq =
    frequency === "daily" ||
    frequency === "weekly" ||
    frequency === "monthly"
      ? frequency
      : "none";

  const [created] = await db
    .insert(events)
    .values({
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
      customFields,
      recurrenceFrequency: validFreq,
      recurrenceInterval: validFreq === "none" ? 1 : recurrenceInterval,
      recurrenceUntil: validFreq === "none" ? null : recurrenceUntil,
      ownerId: profile.id,
    })
    .returning();

  // Materialise recurrence occurrences (children) — best effort. Parent
  // (the first row) is already the "series head" and holds the recurrence
  // metadata; each child stores recurrence_parent_id = parent.id but is
  // otherwise an independent editable event.
  if (validFreq !== "none" && created.startAt) {
    try {
      const occs = expandRecurrence({
        startAt: created.startAt,
        endAt: created.endAt,
        frequency: validFreq,
        interval: recurrenceInterval,
        until: recurrenceUntil,
      });
      // Drop the first — it's the parent we already inserted.
      const children = occs.slice(1);
      if (children.length > 0) {
        await db.insert(events).values(
          children.map((o) => ({
            name: parsed.data.name,
            pillarId: parsed.data.pillarId,
            type: parsed.data.type,
            status: parsed.data.status,
            description: parsed.data.description || null,
            location: parsed.data.location || null,
            startAt: o.startAt,
            endAt: o.endAt,
            capacity: parsed.data.capacity,
            clientContactId: parsed.data.clientContactId,
            notes: parsed.data.notes || null,
            customFields,
            recurrenceFrequency: "none" as const,
            recurrenceInterval: 1,
            recurrenceUntil: null,
            recurrenceParentId: created.id,
            ownerId: profile.id,
          })),
        );
      }
    } catch (err) {
      console.error("[events/new] recurrence expansion failed:", err);
    }
  }

  await logAudit({
    userId: profile.id,
    pillarId: created.pillarId,
    entityType: "event",
    entityId: created.id,
    action: "create",
    diff: { snapshot: created },
  });

  // Push mirror to owner's external calendar (Google/Outlook), best-effort.
  await pushEventToExternal({
    id: created.id,
    ownerId: created.ownerId,
    name: created.name,
    description: created.description,
    location: created.location,
    startAt: created.startAt,
    endAt: created.endAt,
    googleEventId: created.googleEventId,
    microsoftEventId: created.microsoftEventId,
  });

  redirect(`/ops/events/${created.id}`);
}
