"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { herbariumSpecies } from "@/lib/db/schema";
import { requireRole } from "@/lib/dal";
import { logAudit } from "@/lib/audit";
import { revalidateHerbarium } from "@/lib/herbarium-revalidate";
import {
  HERBARIUM_HABITATS as HABITATS,
  HERBARIUM_STATUSES as STATUSES,
  HERBARIUM_TAGS as TAGS,
} from "./constants";

export type SpeciesState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const lookalikeSchema = z.object({
  slug: z.string().optional(),
  scientificName: z.string().min(1),
  name: z.object({ pt: z.string(), en: z.string(), es: z.string() }),
  severity: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  howToTell: z.object({ pt: z.string(), en: z.string(), es: z.string() }),
});

const imageSchema = z.object({
  url: z.string().url(),
  part: z.string(),
  // Sem licença, autor e origem a imagem não entra. É a mesma regra dos álbuns
  // do Trailhead, e é o que permite gerar a página de créditos em vez de a
  // escrever à mão.
  license: z.string().min(1),
  author: z.string().min(1),
  sourceUrl: z.string().url(),
  isReveal: z.boolean().optional(),
});

const sourceSchema = z.object({ name: z.string().min(1), url: z.string().url() });

const schema = z.object({
  slug: z
    .string()
    .min(1, "Slug obrigatório.")
    .regex(/^[a-z0-9-]+$/, "Só letras minúsculas, números e hífen."),
  scientificName: z.string().min(1, "Nome científico obrigatório."),
  family: z.string().min(1, "Família obrigatória."),
  namePt: z.string().min(1, "O nome em português é obrigatório."),
  danger: z.number().int().min(0).max(3),
  status: z.enum(STATUSES),
});

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** "erva-doce, fiolho" -> ["erva-doce", "fiolho"] */
function csv(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** "5,6,7" -> [5,6,7], ignorando o que não for mês. */
function months(value: FormDataEntryValue | null): number[] {
  return csv(value)
    .map((n) => Number(n))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 12);
}

function checkboxes(formData: FormData, name: string, allowed: readonly string[]): string[] {
  return formData
    .getAll(name)
    .map(String)
    .filter((v) => allowed.includes(v));
}

/** Campo JSON do formulário. Devolve o erro em vez de rebentar a acção. */
function parseJson<T>(
  raw: string,
  itemSchema: z.ZodType<T>,
  field: string,
  errors: Record<string, string>,
): T[] {
  const text = raw.trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      errors[field] = "Tem de ser uma lista JSON (entre [ ]).";
      return [];
    }
    const result = z.array(itemSchema).safeParse(parsed);
    if (!result.success) {
      errors[field] = result.error.issues[0]?.message ?? "JSON inválido.";
      return [];
    }
    return result.data;
  } catch {
    errors[field] = "JSON inválido.";
    return [];
  }
}

function readForm(formData: FormData) {
  const scientificName = String(formData.get("scientificName") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  const namePt = String(formData.get("namePt") ?? "").trim();
  const fieldErrors: Record<string, string> = {};

  return {
    fieldErrors,
    values: {
      slug: slugify(slugRaw || namePt || scientificName),
      scientificName,
      family: String(formData.get("family") ?? "").trim(),
      namePt,
      nameEn: String(formData.get("nameEn") ?? "").trim() || null,
      nameEs: String(formData.get("nameEs") ?? "").trim() || null,
      akaPt: csv(formData.get("akaPt")),
      akaEn: csv(formData.get("akaEn")),
      akaEs: csv(formData.get("akaEs")),
      habitat: checkboxes(formData, "habitat", HABITATS),
      monthsFlower: months(formData.get("monthsFlower")),
      monthsFruit: months(formData.get("monthsFruit")),
      tags: checkboxes(formData, "tags", TAGS),
      danger: Number(formData.get("danger") ?? 0),
      summaryPt: String(formData.get("summaryPt") ?? "").trim() || null,
      summaryEn: String(formData.get("summaryEn") ?? "").trim() || null,
      summaryEs: String(formData.get("summaryEs") ?? "").trim() || null,
      fieldMarksPt: String(formData.get("fieldMarksPt") ?? "").trim() || null,
      fieldMarksEn: String(formData.get("fieldMarksEn") ?? "").trim() || null,
      fieldMarksEs: String(formData.get("fieldMarksEs") ?? "").trim() || null,
      usesPt: String(formData.get("usesPt") ?? "").trim() || null,
      usesEn: String(formData.get("usesEn") ?? "").trim() || null,
      usesEs: String(formData.get("usesEs") ?? "").trim() || null,
      legalNotePt: String(formData.get("legalNotePt") ?? "").trim() || null,
      legalNoteEn: String(formData.get("legalNoteEn") ?? "").trim() || null,
      legalNoteEs: String(formData.get("legalNoteEs") ?? "").trim() || null,
      lookalikes: parseJson(
        String(formData.get("lookalikes") ?? ""),
        lookalikeSchema,
        "lookalikes",
        fieldErrors,
      ),
      images: parseJson(String(formData.get("images") ?? ""), imageSchema, "images", fieldErrors),
      sources: parseJson(String(formData.get("sources") ?? ""), sourceSchema, "sources", fieldErrors),
      status: String(formData.get("status") ?? "draft"),
    },
  };
}

/**
 * A regra que não se negoceia: uma ficha comestível não é publicável sem o
 * bloco de sósias preenchido. É a mesma regra do plano do produto, imposta aqui
 * para que nenhum descuido de edição a contorne.
 */
function safetyGate(values: {
  tags: string[];
  status: string;
  lookalikes: unknown[];
}): string | null {
  if (values.status !== "published") return null;
  if (values.tags.includes("edible") && values.lookalikes.length === 0) {
    return "Uma ficha marcada como comestível não pode ser publicada sem pelo menos uma sósia descrita. Se realmente não tem sósias na Península Ibérica, escreve-o no texto e junta uma entrada com severidade 1.";
  }
  return null;
}

async function save(
  mode: "create" | "update",
  originalSlug: string | null,
  formData: FormData,
): Promise<SpeciesState | never> {
  const profile = await requireRole("admin_grupo");
  const { values, fieldErrors } = readForm(formData);

  const parsed = schema.safeParse({
    slug: values.slug,
    scientificName: values.scientificName,
    family: values.family,
    namePt: values.namePt,
    danger: values.danger,
    status: values.status,
  });
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
  }

  const gate = safetyGate(values);
  if (gate) return { error: gate };
  if (Object.keys(fieldErrors).length > 0) {
    return { error: "Corrige os campos assinalados.", fieldErrors };
  }

  const row = {
    ...values,
    status: values.status as (typeof STATUSES)[number],
    danger: values.danger,
  };

  try {
    if (mode === "create") {
      await db.insert(herbariumSpecies).values(row);
    } else {
      await db
        .update(herbariumSpecies)
        .set(row)
        .where(eq(herbariumSpecies.slug, originalSlug!));
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes("duplicate key")) {
      return { error: "Já existe uma ficha com esse slug.", fieldErrors: { slug: "Slug em uso." } };
    }
    return { error: `Não foi possível gravar: ${message}` };
  }

  await logAudit({
    userId: profile.id,
    entityType: "herbarium_species",
    entityId: null,
    action: mode,
    diff: { slug: values.slug, status: values.status },
  }).catch(() => undefined);

  revalidatePath("/admin/herbarium");
  await revalidateHerbarium([`/plantas/${values.slug}`]);
  redirect("/admin/herbarium");
}

export async function createSpecies(
  _prev: SpeciesState | undefined,
  formData: FormData,
): Promise<SpeciesState> {
  return save("create", null, formData);
}

export async function updateSpecies(
  slug: string,
  _prev: SpeciesState | undefined,
  formData: FormData,
): Promise<SpeciesState> {
  return save("update", slug, formData);
}

export async function deleteSpecies(slug: string): Promise<void> {
  const profile = await requireRole("admin_grupo");
  await db.delete(herbariumSpecies).where(eq(herbariumSpecies.slug, slug));
  await logAudit({
    userId: profile.id,
    entityType: "herbarium_species",
    entityId: null,
    action: "delete",
    diff: { slug },
  }).catch(() => undefined);
  revalidatePath("/admin/herbarium");
  await revalidateHerbarium(["/plantas"]);
}

