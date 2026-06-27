"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { requireRole } from "@/lib/dal";
import { logAudit } from "@/lib/audit";

const VALID_TYPES = ["lead", "customer", "partner", "vendor"] as const;
const VALID_STAGES = [
  "new",
  "qualified",
  "active",
  "on_hold",
  "closed_won",
  "closed_lost",
] as const;

export type ImportContactsState = {
  error?: string;
  preview?: {
    pillarId: string;
    rows: ImportRow[];
    duplicates: string[]; // emails that already exist
    skipped: number; // rows missing required fields
  };
  result?: {
    inserted: number;
    skipped: number;
  };
};

export type ImportRow = {
  fullName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  jobTitle: string | null;
  type: (typeof VALID_TYPES)[number];
  stage: (typeof VALID_STAGES)[number];
  notes: string | null;
};

const MAX_ROWS = 2000;
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB — matches doc upload limit

/**
 * Minimal CSV parser. Handles double-quoted fields with embedded commas
 * and escaped quotes ("foo,""bar"""). No streaming — file is bounded to
 * MAX_FILE_SIZE so loading the whole thing is fine.
 */
function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < input.length) {
    const ch = input[i];

    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      row.push(field);
      field = "";
      if (row.length > 0 && !(row.length === 1 && row[0] === "")) {
        rows.push(row);
      }
      row = [];
      if (ch === "\r" && input[i + 1] === "\n") i += 2;
      else i++;
      continue;
    }
    field += ch;
    i++;
  }
  if (field || row.length > 0) {
    row.push(field);
    if (!(row.length === 1 && row[0] === "")) rows.push(row);
  }
  return rows;
}

function normalizeHeader(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[\s_\-]+/g, "");
}

const HEADER_MAP: Record<string, keyof ImportRow> = {
  fullname: "fullName",
  name: "fullName",
  nome: "fullName",
  nomecompleto: "fullName",
  email: "email",
  mail: "email",
  emaildecontacto: "email",
  phone: "phone",
  telefone: "phone",
  telefono: "phone",
  company: "company",
  empresa: "company",
  jobtitle: "jobTitle",
  cargo: "jobTitle",
  position: "jobTitle",
  type: "type",
  tipo: "type",
  stage: "stage",
  fase: "stage",
  estado: "stage",
  notes: "notes",
  notas: "notes",
  observacoes: "notes",
};

function asType(raw: string): (typeof VALID_TYPES)[number] {
  const t = raw.trim().toLowerCase();
  if ((VALID_TYPES as readonly string[]).includes(t)) {
    return t as (typeof VALID_TYPES)[number];
  }
  return "lead";
}

function asStage(raw: string): (typeof VALID_STAGES)[number] {
  const s = raw.trim().toLowerCase();
  if ((VALID_STAGES as readonly string[]).includes(s)) {
    return s as (typeof VALID_STAGES)[number];
  }
  return "new";
}

async function readCsvAndMap(
  file: File,
): Promise<{ rows: ImportRow[]; skipped: number } | { error: string }> {
  if (file.size > MAX_FILE_SIZE) {
    return { error: `Ficheiro maior que ${MAX_FILE_SIZE / 1024 / 1024} MB.` };
  }
  const text = await file.text();
  const raw = parseCsv(text);
  if (raw.length === 0) return { error: "CSV vazio." };

  const header = raw[0].map(normalizeHeader);
  const indexOf = (key: keyof ImportRow): number => {
    for (let i = 0; i < header.length; i++) {
      if (HEADER_MAP[header[i]] === key) return i;
    }
    return -1;
  };

  const idxName = indexOf("fullName");
  const idxEmail = indexOf("email");
  const idxPhone = indexOf("phone");
  const idxCompany = indexOf("company");
  const idxJob = indexOf("jobTitle");
  const idxType = indexOf("type");
  const idxStage = indexOf("stage");
  const idxNotes = indexOf("notes");

  if (idxName === -1) {
    return {
      error: "Coluna obrigatória «name» / «nome» / «fullName» não encontrada.",
    };
  }

  const rows: ImportRow[] = [];
  let skipped = 0;
  for (let i = 1; i < raw.length; i++) {
    const r = raw[i];
    const name = (r[idxName] ?? "").trim();
    if (!name) {
      skipped++;
      continue;
    }
    rows.push({
      fullName: name,
      email:
        idxEmail !== -1
          ? (r[idxEmail] ?? "").trim().toLowerCase() || null
          : null,
      phone:
        idxPhone !== -1 ? (r[idxPhone] ?? "").trim() || null : null,
      company:
        idxCompany !== -1 ? (r[idxCompany] ?? "").trim() || null : null,
      jobTitle: idxJob !== -1 ? (r[idxJob] ?? "").trim() || null : null,
      type: idxType !== -1 ? asType(r[idxType] ?? "") : "lead",
      stage: idxStage !== -1 ? asStage(r[idxStage] ?? "") : "new",
      notes: idxNotes !== -1 ? (r[idxNotes] ?? "").trim() || null : null,
    });
    if (rows.length >= MAX_ROWS) break;
  }

  return { rows, skipped };
}

export async function previewImport(
  _prev: ImportContactsState | undefined,
  formData: FormData,
): Promise<ImportContactsState> {
  await requireRole("admin_grupo");

  const pillarId = String(formData.get("pillarId") ?? "");
  if (!pillarId) return { error: "Tens de escolher um pilar." };

  const file = formData.get("file");
  if (!file || !(file instanceof File) || file.size === 0) {
    return { error: "Tens de seleccionar um ficheiro CSV." };
  }

  const parsed = await readCsvAndMap(file);
  if ("error" in parsed) return { error: parsed.error };
  if (parsed.rows.length === 0) {
    return { error: "Nenhuma linha válida encontrada." };
  }

  // Find emails that already exist on this pillar to flag as duplicates.
  const emails = parsed.rows
    .map((r) => r.email)
    .filter((e): e is string => Boolean(e));

  let duplicateEmails = new Set<string>();
  if (emails.length > 0) {
    const existing = await db
      .select({ email: contacts.email })
      .from(contacts)
      .where(
        and(
          eq(contacts.pillarId, pillarId),
          inArray(contacts.email, emails),
          isNotNull(contacts.email),
        ),
      );
    duplicateEmails = new Set(
      existing.map((r) => r.email).filter((e): e is string => Boolean(e)),
    );
  }

  return {
    preview: {
      pillarId,
      rows: parsed.rows,
      duplicates: Array.from(duplicateEmails),
      skipped: parsed.skipped,
    },
  };
}

export async function commitImport(
  _prev: ImportContactsState | undefined,
  formData: FormData,
): Promise<ImportContactsState> {
  const profile = await requireRole("admin_grupo");

  const pillarId = String(formData.get("pillarId") ?? "");
  const payload = String(formData.get("payload") ?? "");
  if (!pillarId || !payload) return { error: "Sessão de import expirada." };

  let rows: ImportRow[];
  try {
    rows = JSON.parse(payload) as ImportRow[];
  } catch {
    return { error: "Payload inválido." };
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    return { error: "Sem linhas para importar." };
  }
  if (rows.length > MAX_ROWS) {
    return { error: `Demasiadas linhas (máx ${MAX_ROWS}).` };
  }

  // Skip rows whose email already exists for this pillar to avoid duplicates.
  const emails = rows
    .map((r) => r.email)
    .filter((e): e is string => Boolean(e));
  let existing = new Set<string>();
  if (emails.length > 0) {
    const ex = await db
      .select({ email: contacts.email })
      .from(contacts)
      .where(
        and(
          eq(contacts.pillarId, pillarId),
          inArray(contacts.email, emails),
          isNotNull(contacts.email),
        ),
      );
    existing = new Set(
      ex.map((r) => r.email).filter((e): e is string => Boolean(e)),
    );
  }

  const toInsert = rows
    .filter((r) => !r.email || !existing.has(r.email))
    .map((r) => ({
      fullName: r.fullName,
      email: r.email,
      phone: r.phone,
      company: r.company,
      jobTitle: r.jobTitle,
      type: r.type,
      stage: r.stage,
      notes: r.notes,
      pillarId,
      ownerId: profile.id,
    }));

  if (toInsert.length === 0) {
    return { result: { inserted: 0, skipped: rows.length } };
  }

  const inserted = await db.insert(contacts).values(toInsert).returning({
    id: contacts.id,
    pillarId: contacts.pillarId,
  });

  // Audit each insert (truncated diff to keep entries small).
  for (const row of inserted) {
    try {
      await logAudit({
        userId: profile.id,
        pillarId: row.pillarId,
        entityType: "contact",
        entityId: row.id,
        action: "create",
        diff: { bulkImport: true },
      });
    } catch (err) {
      console.error("[crm/import] audit failed:", err);
    }
  }

  revalidatePath("/crm");
  redirect("/crm");
}
