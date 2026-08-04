"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { siteEvents, trailLibrary } from "@/lib/db/schema";
import { requireRole } from "@/lib/dal";
import { logAudit } from "@/lib/audit";

export type TrailState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const ESTADOS = [
  "por triar",
  "ideia",
  "a reconhecer",
  "reconhecido",
  "ficha operacional",
  "activo no site",
] as const;
const CONFIANCAS = ["alta", "média", "baixa"] as const;

const schema = z.object({
  nome: z.string().min(1, "Nome obrigatório."),
  codigo: z.string().nullable(),
  concelho: z.string().nullable(),
  regiao: z.string().nullable(),
  areaProtegida: z.string().nullable(),
  distanciaKm: z.number().min(0).max(2000).nullable(),
  tipo: z.string().nullable(),
  duracao: z.string().nullable(),
  dificuldade: z.number().int().min(1).max(5).nullable(),
  tema: z.string().nullable(),
  epoca: z.string().nullable(),
  autorizacao: z.string().nullable(),
  limiteGrupo: z.number().int().min(0).max(500).nullable(),
  viagemLeiriaMin: z.number().int().min(0).max(1000).nullable(),
  potencial: z.enum(["A", "B", "C"]).nullable(),
  estado: z.enum(ESTADOS),
  confianca: z.enum(CONFIANCAS),
  avisos: z.string().nullable(),
  notas: z.string().nullable(),
});

function textOrNull(v: FormDataEntryValue | null): string | null {
  const raw = String(v ?? "").trim();
  return raw || null;
}

function intOrNull(v: FormDataEntryValue | null): number | null {
  const raw = String(v ?? "").trim();
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

function numOrNull(v: FormDataEntryValue | null): number | null {
  const raw = String(v ?? "").trim().replace(",", ".");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

export async function updateTrail(
  id: string,
  _prev: TrailState | undefined,
  formData: FormData,
): Promise<TrailState> {
  const profile = await requireRole("admin_grupo");

  const before = await db.query.trailLibrary.findFirst({
    where: eq(trailLibrary.id, id),
  });
  if (!before) return { error: "Não encontrado." };

  const potencialRaw = textOrNull(formData.get("potencial"));
  const parsed = schema.safeParse({
    nome: String(formData.get("nome") ?? "").trim(),
    codigo: textOrNull(formData.get("codigo")),
    concelho: textOrNull(formData.get("concelho")),
    regiao: textOrNull(formData.get("regiao")),
    areaProtegida: textOrNull(formData.get("areaProtegida")),
    distanciaKm: numOrNull(formData.get("distanciaKm")),
    tipo: textOrNull(formData.get("tipo")),
    duracao: textOrNull(formData.get("duracao")),
    dificuldade: intOrNull(formData.get("dificuldade")),
    tema: textOrNull(formData.get("tema")),
    epoca: textOrNull(formData.get("epoca")),
    autorizacao: textOrNull(formData.get("autorizacao")),
    limiteGrupo: intOrNull(formData.get("limiteGrupo")),
    viagemLeiriaMin: intOrNull(formData.get("viagemLeiriaMin")),
    potencial: potencialRaw as "A" | "B" | "C" | null,
    estado: (formData.get("estado") as string) || "por triar",
    confianca: (formData.get("confianca") as string) || "média",
    avisos: textOrNull(formData.get("avisos")),
    notas: textOrNull(formData.get("notas")),
  });

  if (!parsed.success) {
    const fieldErrors = z.flattenError(parsed.error).fieldErrors as Record<
      string,
      string[] | undefined
    >;
    const first = Object.entries(fieldErrors)[0];
    return {
      error: first ? `${first[0]}: ${first[1]?.[0] ?? ""}` : "Dados inválidos.",
    };
  }

  const [updated] = await db
    .update(trailLibrary)
    .set({
      ...parsed.data,
      // numeric() em Drizzle troca strings; o schema já validou o número.
      distanciaKm:
        parsed.data.distanciaKm === null ? null : String(parsed.data.distanciaKm),
      updatedBy: profile.id,
      updatedAt: new Date(),
    })
    .where(eq(trailLibrary.id, id))
    .returning();

  await logAudit({
    userId: profile.id,
    entityType: "trail_library",
    entityId: id,
    action: "update",
    diff: { before, after: updated },
  });

  revalidatePath("/admin/trails");
  redirect("/admin/trails");
}

/**
 * Mapeia o cluster interno da biblioteca para o código de região que o site
 * usa no mapa (REGIONS em web/src/types/event.ts). É uma tentativa: quando não
 * há correspondência clara devolve null e quem edita escolhe no formulário.
 */
function regiaoDoSite(t: {
  regiao: string | null;
  concelho: string | null;
  areaProtegida: string | null;
}): string | null {
  const concelho = t.concelho ?? "";
  if (concelho === "Ourém") return "fatima";
  if (concelho === "Arouca") return "arouca";
  if (["Sintra", "Cascais"].includes(concelho)) return "sintra-cascais";
  if (
    ["Figueiró dos Vinhos", "Pedrógão Grande", "Castanheira de Pera"].includes(
      concelho,
    )
  ) {
    return "pinhal";
  }
  if (t.areaProtegida === "PNSAC") return "aire-candeeiros";
  switch (t.regiao) {
    case "LEIRIA":
      return "leiria";
    case "GERES":
      return "peneda-geres";
    case "ESTRELA":
      return "estrela";
    case "INTERNACIONAL":
      return "santiago";
    default:
      return null;
  }
}

/**
 * Cria uma caminhada na agenda a partir de um trilho da biblioteca.
 *
 * Fica em RASCUNHO e leva só o que se sabe do trilho: nome, local, distância,
 * dificuldade e, quando o percurso tem limite de participantes imposto pelo
 * ICNF, o número de vagas já limitado a esse máximo. Data, preço e descrição
 * ficam por preencher, que é onde o trabalho editorial começa.
 */
export async function createEventFromTrail(id: string): Promise<void> {
  const profile = await requireRole("admin_grupo");

  const trail = await db.query.trailLibrary.findFirst({
    where: eq(trailLibrary.id, id),
  });
  if (!trail) return;

  // Slug livre: o mesmo trilho pode dar origem a várias edições ao longo do ano.
  const base = slugify(trail.nome) || "caminhada";
  const existentes = await db
    .select({ slug: siteEvents.slug })
    .from(siteEvents);
  const usados = new Set(existentes.map((e) => e.slug));
  let slug = base;
  for (let n = 2; usados.has(slug); n++) slug = `${base}-${n}`;

  const km = trail.distanciaKm === null ? null : Number(trail.distanciaKm);

  const [created] = await db
    .insert(siteEvents)
    .values({
      slug,
      title: trail.nome,
      summary: "",
      description: "",
      type: "adventure",
      location: [trail.concelho, trail.distrito].filter(Boolean).join(", "),
      region: regiaoDoSite(trail),
      distance: km === null ? null : `${String(km).replace(".", ",")} km`,
      difficulty: trail.dificuldade,
      // O limite do ICNF é um tecto, não uma meta: entra como vagas máximas.
      maxParticipants: trail.limiteGrupo ?? 0,
      price: 0,
      status: "draft",
      createdBy: profile.id,
      updatedBy: profile.id,
    })
    .returning();

  await logAudit({
    userId: profile.id,
    entityType: "site_event",
    entityId: created.id,
    action: "create",
    diff: { snapshot: created, from_trail: trail.ref },
  });

  // Marca o trilho como já usado, sem baixar um estado mais avançado.
  if (trail.estado !== "activo no site") {
    await db
      .update(trailLibrary)
      .set({ estado: "activo no site", updatedBy: profile.id, updatedAt: new Date() })
      .where(eq(trailLibrary.id, id));
  }

  revalidatePath("/admin/trails");
  revalidatePath("/admin/adventures");
  redirect(`/admin/adventures/${created.id}`);
}
