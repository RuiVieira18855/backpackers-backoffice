"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents, events, projects } from "@/lib/db/schema";
import { requireSkill } from "@/lib/dal";
import { logAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { supabaseAdmin, DOCUMENTS_BUCKET } from "@/lib/supabase/admin";

export type UploadDocumentState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const TYPES = [
  "procedure",
  "contract",
  "report",
  "portfolio",
  "other",
] as const;

// Vercel server actions cap request body at ~4.5MB. Keep matching limit here.
const MAX_FILE_SIZE = 4 * 1024 * 1024;

const schema = z.object({
  title: z.string().min(1),
  pillarId: z.uuid(),
  type: z.enum(TYPES),
  description: z.string().optional(),
  eventId: z.uuid().nullable(),
  projectId: z.uuid().nullable(),
});

function sanitizeFileName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 200);
}

export async function uploadDocument(
  _prev: UploadDocumentState | undefined,
  formData: FormData,
): Promise<UploadDocumentState> {
  const profile = await requireSkill("docs");
  const tErrors = await getTranslations("docs.form.errors");

  const file = formData.get("file");
  if (!file || !(file instanceof File) || file.size === 0) {
    return { fieldErrors: { file: tErrors("fileRequired") } };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { fieldErrors: { file: tErrors("fileTooLarge") } };
  }

  const raw = {
    title: String(formData.get("title") ?? "").trim(),
    pillarId: String(formData.get("pillarId") ?? ""),
    type: formData.get("type") as string,
    description: String(formData.get("description") ?? "").trim(),
    eventId: String(formData.get("eventId") ?? "") || null,
    projectId: String(formData.get("projectId") ?? "") || null,
  };
  const returnTo = String(formData.get("returnTo") ?? "").trim();

  if (!raw.title) return { fieldErrors: { title: tErrors("titleRequired") } };
  if (!raw.pillarId) return { fieldErrors: { pillarId: tErrors("pillarRequired") } };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const flat = z.flattenError(parsed.error);
    const first = Object.entries(flat.fieldErrors)[0];
    return {
      error: first ? `${first[0]}: ${first[1]?.[0] ?? ""}` : "Invalid data",
    };
  }

  // Upload to Storage first; if it fails we never insert a stale DB row.
  const safeName = sanitizeFileName(file.name);
  const ts = Math.floor(new Date(2026, 5, 21).getTime() / 1000); // stable per-call timestamp avoided via random suffix below
  const randomSuffix = Math.random().toString(36).slice(2, 10);
  const storagePath = `${parsed.data.pillarId}/${randomSuffix}-${safeName}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabaseAdmin.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    return { error: `Upload: ${uploadError.message}` };
  }

  const [created] = await db
    .insert(documents)
    .values({
      title: parsed.data.title,
      pillarId: parsed.data.pillarId,
      type: parsed.data.type,
      description: parsed.data.description || null,
      storagePath,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || null,
      uploadedBy: profile.id,
      eventId: parsed.data.eventId,
      projectId: parsed.data.projectId,
    })
    .returning();

  await logAudit({
    userId: profile.id,
    pillarId: created.pillarId,
    entityType: "document",
    entityId: created.id,
    action: "create",
    diff: { snapshot: created },
  });

  // Notify the event/project owner when a doc is linked to one.
  try {
    if (created.eventId) {
      const ev = await db.query.events.findFirst({
        where: eq(events.id, created.eventId),
        columns: { id: true, name: true, ownerId: true },
      });
      if (ev?.ownerId) {
        await createNotification({
          userId: ev.ownerId,
          actorId: profile.id,
          pillarId: created.pillarId,
          kind: "event_doc",
          title: `Documento em «${ev.name}»: ${created.title}`,
          body: created.fileName,
          link: `/ops/events/${ev.id}`,
        });
      }
    } else if (created.projectId) {
      const pr = await db.query.projects.findFirst({
        where: eq(projects.id, created.projectId),
        columns: { id: true, name: true, ownerId: true },
      });
      if (pr?.ownerId) {
        await createNotification({
          userId: pr.ownerId,
          actorId: profile.id,
          pillarId: created.pillarId,
          kind: "project_doc",
          title: `Documento em «${pr.name}»: ${created.title}`,
          body: created.fileName,
          link: `/ops/projects/${pr.id}`,
        });
      }
    }
  } catch (err) {
    console.error("[notifications] linked doc failed:", err);
  }

  if (returnTo.startsWith("/")) {
    redirect(returnTo);
  }
  redirect(`/docs/${created.id}`);
}
