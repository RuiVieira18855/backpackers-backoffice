"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { blogPosts } from "@/lib/db/schema";
import { requireRole } from "@/lib/dal";
import { logAudit } from "@/lib/audit";
import { supabaseAdmin, BLOG_BUCKET } from "@/lib/supabase/admin";
import { revalidateWeb } from "@/lib/web-revalidate";

export type BlogState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const PILLARS = ["bwa", "adventures", "synergy", "labs"] as const;
const STATUSES = ["draft", "published"] as const;

// Vercel server actions cap request body at ~4.5MB. Keep cover images under it.
const MAX_IMAGE_SIZE = 4 * 1024 * 1024;

const schema = z.object({
  slug: z
    .string()
    .min(1, "Slug obrigatório.")
    .regex(/^[a-z0-9-]+$/, "Só letras minúsculas, números e hífen."),
  title: z.string().min(1, "Título obrigatório."),
  excerpt: z.string().optional(),
  content: z.string().optional(),
  pillar: z.enum(PILLARS),
  category: z.string().optional(),
  author: z.string().optional(),
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

function readForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  return {
    slug: slugify(slugRaw || title),
    title,
    excerpt: String(formData.get("excerpt") ?? "").trim() || undefined,
    content: String(formData.get("content") ?? ""),
    pillar: (formData.get("pillar") as string) || "bwa",
    category: String(formData.get("category") ?? "").trim() || undefined,
    author: String(formData.get("author") ?? "").trim() || undefined,
    status: (formData.get("status") as string) || "draft",
  };
}

async function uploadCover(file: File): Promise<string> {
  const safe = sanitizeFileName(file.name);
  const rand = Math.random().toString(36).slice(2, 10);
  const path = `${rand}-${safe}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabaseAdmin.storage
    .from(BLOG_BUCKET)
    .upload(path, buffer, {
      contentType: file.type || "image/jpeg",
      cacheControl: "3600",
      upsert: false,
    });
  if (error) throw new Error(`Upload da imagem: ${error.message}`);
  return supabaseAdmin.storage.from(BLOG_BUCKET).getPublicUrl(path).data
    .publicUrl;
}

async function resolveCover(
  formData: FormData,
  existing: string | null,
): Promise<{ cover: string | null; error?: string }> {
  const file = formData.get("coverFile");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_IMAGE_SIZE) {
      return { cover: existing, error: "A imagem excede 4MB." };
    }
    try {
      return { cover: await uploadCover(file) };
    } catch (err) {
      return {
        cover: existing,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
  // No new file: keep whatever the hidden field carries (existing on edit).
  const kept = String(formData.get("coverImage") ?? "").trim();
  return { cover: kept || existing };
}

export async function createBlogPost(
  _prev: BlogState | undefined,
  formData: FormData,
): Promise<BlogState> {
  const profile = await requireRole("admin_grupo");
  const raw = readForm(formData);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const flat = z.flattenError(parsed.error);
    const first = Object.entries(flat.fieldErrors)[0];
    return {
      error: first ? `${first[0]}: ${first[1]?.[0] ?? ""}` : "Dados inválidos.",
    };
  }

  const { cover, error: coverError } = await resolveCover(formData, null);
  if (coverError) return { fieldErrors: { coverFile: coverError } };

  const publishedAt = parsed.data.status === "published" ? new Date() : null;

  let slug = parsed.data.slug;
  try {
    const [created] = await db
      .insert(blogPosts)
      .values({
        slug: parsed.data.slug,
        title: parsed.data.title,
        excerpt: parsed.data.excerpt ?? "",
        content: parsed.data.content ?? "",
        pillar: parsed.data.pillar,
        category: parsed.data.category ?? "",
        author: parsed.data.author || "Backpackers World Adventures",
        coverImage: cover,
        status: parsed.data.status,
        publishedAt,
        createdBy: profile.id,
        updatedBy: profile.id,
      })
      .returning();
    slug = created.slug;

    await logAudit({
      userId: profile.id,
      entityType: "blog_post",
      entityId: created.id,
      action: "create",
      diff: { snapshot: created },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/duplicate key|unique/i.test(msg)) {
      return { fieldErrors: { slug: "Já existe um post com este slug." } };
    }
    return { error: msg };
  }

  revalidatePath("/admin/blog");
  if (publishedAt) await revalidateWeb(["/blog", `/blog/${slug}`]);
  redirect("/admin/blog");
}

export async function updateBlogPost(
  id: string,
  _prev: BlogState | undefined,
  formData: FormData,
): Promise<BlogState> {
  const profile = await requireRole("admin_grupo");

  const before = await db.query.blogPosts.findFirst({
    where: eq(blogPosts.id, id),
  });
  if (!before) return { error: "Não encontrado." };

  const raw = readForm(formData);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const flat = z.flattenError(parsed.error);
    const first = Object.entries(flat.fieldErrors)[0];
    return {
      error: first ? `${first[0]}: ${first[1]?.[0] ?? ""}` : "Dados inválidos.",
    };
  }

  const { cover, error: coverError } = await resolveCover(
    formData,
    before.coverImage,
  );
  if (coverError) return { fieldErrors: { coverFile: coverError } };

  // Stamp publishedAt the first time it goes live; keep the original date after.
  const publishedAt =
    parsed.data.status === "published"
      ? (before.publishedAt ?? new Date())
      : before.publishedAt;

  try {
    const [updated] = await db
      .update(blogPosts)
      .set({
        slug: parsed.data.slug,
        title: parsed.data.title,
        excerpt: parsed.data.excerpt ?? "",
        content: parsed.data.content ?? "",
        pillar: parsed.data.pillar,
        category: parsed.data.category ?? "",
        author: parsed.data.author || "Backpackers World Adventures",
        coverImage: cover,
        status: parsed.data.status,
        publishedAt,
        updatedBy: profile.id,
        updatedAt: new Date(),
      })
      .where(eq(blogPosts.id, id))
      .returning();

    await logAudit({
      userId: profile.id,
      entityType: "blog_post",
      entityId: id,
      action: "update",
      diff: { before, after: updated },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/duplicate key|unique/i.test(msg)) {
      return { fieldErrors: { slug: "Já existe um post com este slug." } };
    }
    return { error: msg };
  }

  revalidatePath("/admin/blog");
  // Revalidate old and new slug in case the slug changed while published.
  const paths = new Set(["/blog", `/blog/${parsed.data.slug}`]);
  if (before.slug) paths.add(`/blog/${before.slug}`);
  if (before.status === "published" || parsed.data.status === "published") {
    await revalidateWeb([...paths]);
  }
  redirect("/admin/blog");
}

export async function deleteBlogPost(id: string): Promise<void> {
  const profile = await requireRole("admin_grupo");
  const before = await db.query.blogPosts.findFirst({
    where: eq(blogPosts.id, id),
  });
  if (!before) return;
  await db.delete(blogPosts).where(eq(blogPosts.id, id));
  await logAudit({
    userId: profile.id,
    entityType: "blog_post",
    entityId: id,
    action: "delete",
    diff: { snapshot: before },
  });
  revalidatePath("/admin/blog");
  if (before.status === "published") {
    await revalidateWeb(["/blog", `/blog/${before.slug}`]);
  }
}

export async function toggleBlogPostPublished(
  id: string,
  publish: boolean,
): Promise<void> {
  const profile = await requireRole("admin_grupo");
  const before = await db.query.blogPosts.findFirst({
    where: eq(blogPosts.id, id),
  });
  if (!before) return;
  const [updated] = await db
    .update(blogPosts)
    .set({
      status: publish ? "published" : "draft",
      publishedAt: publish ? (before.publishedAt ?? new Date()) : before.publishedAt,
      updatedBy: profile.id,
      updatedAt: new Date(),
    })
    .where(eq(blogPosts.id, id))
    .returning();
  await logAudit({
    userId: profile.id,
    entityType: "blog_post",
    entityId: id,
    action: "update",
    diff: {
      before: { status: before.status },
      after: { status: updated.status },
    },
  });
  revalidatePath("/admin/blog");
  await revalidateWeb(["/blog", `/blog/${before.slug}`]);
}
