import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { customFieldDefs } from "@/lib/db/schema";

export type CustomFieldEntity = "contact" | "event" | "project" | "deal";
export type CustomFieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "select";

export type CustomFieldDefRow = {
  id: string;
  key: string;
  label: string;
  type: CustomFieldType;
  options: string[];
  required: boolean;
};

/**
 * Fetch the active custom field definitions for an entity type, ordered
 * by sort_order. Never throws — returns [] if the table is missing or the
 * query fails (so feature flag is effectively "table exists + has rows").
 */
export async function getCustomFieldDefs(
  entity: CustomFieldEntity,
): Promise<CustomFieldDefRow[]> {
  try {
    const rows = await db
      .select({
        id: customFieldDefs.id,
        key: customFieldDefs.key,
        label: customFieldDefs.label,
        type: customFieldDefs.type,
        options: customFieldDefs.options,
        required: customFieldDefs.required,
      })
      .from(customFieldDefs)
      .where(eq(customFieldDefs.entityType, entity))
      .orderBy(asc(customFieldDefs.sortOrder), asc(customFieldDefs.label));
    return rows;
  } catch (err) {
    console.error(`[custom-fields] fetch defs (${entity}) failed:`, err);
    return [];
  }
}

/**
 * Read `cf_<key>` form fields from a FormData and shape them into a JSONB
 * payload, casting values according to the definition. Empty strings become
 * null (so we don't store "" everywhere).
 */
export function parseCustomFieldsFromFormData(
  formData: FormData,
  defs: CustomFieldDefRow[],
): Record<string, string | number | null> {
  const out: Record<string, string | number | null> = {};
  for (const def of defs) {
    const raw = String(formData.get(`cf_${def.key}`) ?? "").trim();
    if (!raw) {
      out[def.key] = null;
      continue;
    }
    if (def.type === "number") {
      const n = Number(raw);
      out[def.key] = Number.isFinite(n) ? n : null;
    } else {
      out[def.key] = raw;
    }
  }
  return out;
}
