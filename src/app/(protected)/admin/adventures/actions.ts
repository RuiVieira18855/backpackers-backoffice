"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { siteEvents } from "@/lib/db/schema";
import { requireRole } from "@/lib/dal";
import { logAudit } from "@/lib/audit";
import { supabaseAdmin, EVENTS_BUCKET } from "@/lib/supabase/admin";
import { revalidateWeb } from "@/lib/web-revalidate";
import { fromLisbonLocal } from "./datetime";

export type AdventureState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const TYPES = ["adventure", "synergy-open", "workshop", "retreat"] as const;
const STATUSES = ["draft", "published", "archived"] as const;

// As server actions da Vercel limitam o body a ~4.5MB no total do pedido.
// Capa + galeria vão no mesmo pedido, por isso o limite é por ficheiro E global.
const MAX_IMAGE_SIZE = 4 * 1024 * 1024;
const MAX_UPLOAD_TOTAL = 4 * 1024 * 1024;

const schema = z.object({
  slug: z
    .string()
    .min(1, "Slug obrigatório.")
    .regex(/^[a-z0-9-]+$/, "Só letras minúsculas, números e hífen."),
  title: z.string().min(1, "Título obrigatório."),
  summary: z.string(),
  description: z.string(),
  startsAt: z.date().nullable(),
  endsAt: z.date().nullable(),
  plannedMonth: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Usa o formato AAAA-MM.")
    .nullable(),
  type: z.enum(TYPES),
  location: z.string(),
  region: z.string().nullable(),
  lat: z.number().min(-90).max(90).nullable(),
  lng: z.number().min(-180).max(180).nullable(),
  meetingPoint: z.string().nullable(),
  distance: z.string().nullable(),
  difficulty: z.number().int().min(1).max(5).nullable(),
  price: z.number().int().min(0, "O preço não pode ser negativo."),
  maxParticipants: z.number().int().min(0),
  images: z.array(z.string()),
  included: z.array(z.string()),
  requirements: z.array(z.string()),
  featured: z.boolean(),
  status: z.enum(STATUSES),
});

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function sanitizeFileName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 200);
}

/** Uma linha não vazia por item. É como o formulário edita listas. */
function toLines(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function toNumberOrNull(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim().replace(",", ".");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function textOrNull(value: FormDataEntryValue | null): string | null {
  const raw = String(value ?? "").trim();
  return raw || null;
}

function readForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  const startsAt = fromLisbonLocal(String(formData.get("startsAt") ?? "").trim());
  return {
    slug: slugify(slugRaw || title),
    title,
    summary: String(formData.get("summary") ?? "").trim(),
    description: String(formData.get("description") ?? ""),
    startsAt,
    endsAt: fromLisbonLocal(String(formData.get("endsAt") ?? "").trim()),
    // O mês previsto só interessa quando a data está por confirmar.
    plannedMonth: startsAt ? null : textOrNull(formData.get("plannedMonth")),
    type: (formData.get("type") as string) || "adventure",
    location: String(formData.get("location") ?? "").trim(),
    region: textOrNull(formData.get("region")),
    lat: toNumberOrNull(formData.get("lat")),
    lng: toNumberOrNull(formData.get("lng")),
    meetingPoint: textOrNull(formData.get("meetingPoint")),
    distance: textOrNull(formData.get("distance")),
    difficulty: toNumberOrNull(formData.get("difficulty")),
    price: toNumberOrNull(formData.get("price")) ?? 0,
    maxParticipants: toNumberOrNull(formData.get("maxParticipants")) ?? 0,
    images: toLines(formData.get("images")),
    included: toLines(formData.get("included")),
    requirements: toLines(formData.get("requirements")),
    featured: formData.get("featured") === "on",
    status: (formData.get("status") as string) || "draft",
  };
}

async function uploadImage(file: File, slug: string): Promise<string> {
  const safe = sanitizeFileName(file.name);
  const rand = Math.random().toString(36).slice(2, 10);
  const path = `${slug || "sem-slug"}/${rand}-${safe}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabaseAdmin.storage
    .from(EVENTS_BUCKET)
    .upload(path, buffer, {
      contentType: file.type || "image/jpeg",
      cacheControl: "3600",
      upsert: false,
    });
  if (error) throw new Error(`Upload da imagem: ${error.message}`);
  return supabaseAdmin.storage.from(EVENTS_BUCKET).getPublicUrl(path).data
    .publicUrl;
}

/**
 * Capa: um ficheiro novo substitui a atual; sem ficheiro, mantém-se o que o
 * campo escondido traz (o valor existente, em edição).
 */
async function resolveCover(
  formData: FormData,
  slug: string,
  existing: string | null,
): Promise<{ cover: string | null; error?: string }> {
  const file = formData.get("coverFile");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_IMAGE_SIZE) {
      return { cover: existing, error: "A imagem excede 4MB." };
    }
    try {
      return { cover: await uploadImage(file, slug) };
    } catch (err) {
      return {
        cover: existing,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
  const kept = String(formData.get("coverImage") ?? "").trim();
  return { cover: kept || existing };
}

/**
 * Galeria: as fotos novas juntam-se aos URLs que já estão na caixa de texto,
 * para que apagar ou reordenar continue a ser possível à mão.
 */
async function resolveGallery(
  formData: FormData,
  slug: string,
  current: string[],
): Promise<{ images: string[]; error?: string }> {
  const files = formData
    .getAll("galleryFiles")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { images: current };

  const total = files.reduce((sum, f) => sum + f.size, 0);
  if (total > MAX_UPLOAD_TOTAL) {
    return {
      images: current,
      error: "As imagens da galeria somam mais de 4MB. Carrega-as por partes.",
    };
  }

  try {
    const uploaded = await Promise.all(files.map((f) => uploadImage(f, slug)));
    return { images: [...current, ...uploaded] };
  } catch (err) {
    return {
      images: current,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function firstError<T>(error: z.ZodError<T>): string {
  const fieldErrors = z.flattenError(error).fieldErrors as Record<
    string,
    string[] | undefined
  >;
  const first = Object.entries(fieldErrors)[0];
  return first ? `${first[0]}: ${first[1]?.[0] ?? ""}` : "Dados inválidos.";
}

/** Páginas do site afectadas por um evento. */
function webPaths(slugs: string[]): string[] {
  return ["/eventos", "/adventures", ...slugs.map((s) => `/eventos/${s}`)];
}

export async function createAdventure(
  _prev: AdventureState | undefined,
  formData: FormData,
): Promise<AdventureState> {
  const profile = await requireRole("admin_grupo");
  const raw = readForm(formData);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { cover, error: coverError } = await resolveCover(
    formData,
    parsed.data.slug,
    null,
  );
  if (coverError) return { fieldErrors: { coverFile: coverError } };

  const { images, error: galleryError } = await resolveGallery(
    formData,
    parsed.data.slug,
    parsed.data.images,
  );
  if (galleryError) return { fieldErrors: { galleryFiles: galleryError } };

  const now = new Date();
  const slug = parsed.data.slug;

  try {
    const [created] = await db
      .insert(siteEvents)
      .values({
        slug,
        title: parsed.data.title,
        summary: parsed.data.summary,
        description: parsed.data.description,
        startsAt: parsed.data.startsAt,
        endsAt: parsed.data.endsAt,
        plannedMonth: parsed.data.plannedMonth,
        type: parsed.data.type,
        location: parsed.data.location,
        region: parsed.data.region,
        lat: parsed.data.lat,
        lng: parsed.data.lng,
        meetingPoint: parsed.data.meetingPoint,
        distance: parsed.data.distance,
        difficulty: parsed.data.difficulty,
        price: parsed.data.price,
        maxParticipants: parsed.data.maxParticipants,
        coverImage: cover,
        images,
        included: parsed.data.included,
        requirements: parsed.data.requirements,
        featured: parsed.data.featured,
        status: parsed.data.status,
        publishedAt: parsed.data.status === "published" ? now : null,
        archivedAt: parsed.data.status === "archived" ? now : null,
        createdBy: profile.id,
        updatedBy: profile.id,
      })
      .returning();

    await logAudit({
      userId: profile.id,
      entityType: "site_event",
      entityId: created.id,
      action: "create",
      diff: { snapshot: created },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/duplicate key|unique/i.test(msg)) {
      return { fieldErrors: { slug: "Já existe uma caminhada com este slug." } };
    }
    return { error: msg };
  }

  revalidatePath("/admin/adventures");
  if (parsed.data.status !== "draft") await revalidateWeb(webPaths([slug]));
  redirect("/admin/adventures");
}

export async function updateAdventure(
  id: string,
  _prev: AdventureState | undefined,
  formData: FormData,
): Promise<AdventureState> {
  const profile = await requireRole("admin_grupo");

  const before = await db.query.siteEvents.findFirst({
    where: eq(siteEvents.id, id),
  });
  if (!before) return { error: "Não encontrado." };

  const raw = readForm(formData);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { cover, error: coverError } = await resolveCover(
    formData,
    parsed.data.slug,
    before.coverImage,
  );
  if (coverError) return { fieldErrors: { coverFile: coverError } };

  const { images, error: galleryError } = await resolveGallery(
    formData,
    parsed.data.slug,
    parsed.data.images,
  );
  if (galleryError) return { fieldErrors: { galleryFiles: galleryError } };

  const now = new Date();
  // publishedAt marca a primeira vez que foi a público e não se mexe depois;
  // archivedAt marca a passagem mais recente a arquivado.
  const publishedAt =
    parsed.data.status === "published"
      ? (before.publishedAt ?? now)
      : before.publishedAt;
  const archivedAt =
    parsed.data.status === "archived" ? (before.archivedAt ?? now) : null;

  try {
    const [updated] = await db
      .update(siteEvents)
      .set({
        slug: parsed.data.slug,
        title: parsed.data.title,
        summary: parsed.data.summary,
        description: parsed.data.description,
        startsAt: parsed.data.startsAt,
        endsAt: parsed.data.endsAt,
        plannedMonth: parsed.data.plannedMonth,
        type: parsed.data.type,
        location: parsed.data.location,
        region: parsed.data.region,
        lat: parsed.data.lat,
        lng: parsed.data.lng,
        meetingPoint: parsed.data.meetingPoint,
        distance: parsed.data.distance,
        difficulty: parsed.data.difficulty,
        price: parsed.data.price,
        maxParticipants: parsed.data.maxParticipants,
        coverImage: cover,
        images,
        included: parsed.data.included,
        requirements: parsed.data.requirements,
        featured: parsed.data.featured,
        status: parsed.data.status,
        publishedAt,
        archivedAt,
        updatedBy: profile.id,
        updatedAt: now,
      })
      .where(eq(siteEvents.id, id))
      .returning();

    await logAudit({
      userId: profile.id,
      entityType: "site_event",
      entityId: id,
      action: "update",
      diff: { before, after: updated },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/duplicate key|unique/i.test(msg)) {
      return { fieldErrors: { slug: "Já existe uma caminhada com este slug." } };
    }
    return { error: msg };
  }

  revalidatePath("/admin/adventures");
  // Revalida o slug antigo também, caso tenha mudado enquanto estava online.
  const slugs = new Set([parsed.data.slug, before.slug]);
  if (before.status !== "draft" || parsed.data.status !== "draft") {
    await revalidateWeb(webPaths([...slugs]));
  }
  redirect("/admin/adventures");
}

export async function deleteAdventure(id: string): Promise<void> {
  const profile = await requireRole("admin_grupo");
  const before = await db.query.siteEvents.findFirst({
    where: eq(siteEvents.id, id),
  });
  if (!before) return;

  await db.delete(siteEvents).where(eq(siteEvents.id, id));
  await logAudit({
    userId: profile.id,
    entityType: "site_event",
    entityId: id,
    action: "delete",
    diff: { snapshot: before },
  });

  revalidatePath("/admin/adventures");
  if (before.status !== "draft") await revalidateWeb(webPaths([before.slug]));
}

/**
 * Muda o estado a partir da listagem. Arquivar tira da agenda mas mantém
 * /eventos/[slug] a responder no site.
 */
export async function setAdventureStatus(
  id: string,
  status: (typeof STATUSES)[number],
): Promise<void> {
  const profile = await requireRole("admin_grupo");
  const before = await db.query.siteEvents.findFirst({
    where: eq(siteEvents.id, id),
  });
  if (!before) return;

  const now = new Date();
  const [updated] = await db
    .update(siteEvents)
    .set({
      status,
      publishedAt:
        status === "published" ? (before.publishedAt ?? now) : before.publishedAt,
      archivedAt: status === "archived" ? (before.archivedAt ?? now) : null,
      updatedBy: profile.id,
      updatedAt: now,
    })
    .where(eq(siteEvents.id, id))
    .returning();

  await logAudit({
    userId: profile.id,
    entityType: "site_event",
    entityId: id,
    action: "update",
    diff: {
      before: { status: before.status },
      after: { status: updated.status },
    },
  });

  revalidatePath("/admin/adventures");
  await revalidateWeb(webPaths([before.slug]));
}
