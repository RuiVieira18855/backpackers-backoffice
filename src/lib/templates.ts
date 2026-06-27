import "server-only";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { templates } from "@/lib/db/schema";

export type TemplateScope =
  | "contact_note"
  | "event_description"
  | "project_description"
  | "deal_description"
  | "task_description"
  | "doc_description"
  | "generic";

export type TemplateOption = {
  id: string;
  name: string;
  body: string;
};

/**
 * Fetch templates available for a given scope. Always includes generic
 * templates as a fallback bucket. Wrapped to never throw — returns [] on
 * failure (templates table may not exist yet).
 */
export async function getTemplatesForScope(
  scope: TemplateScope,
): Promise<TemplateOption[]> {
  const scopes: TemplateScope[] =
    scope === "generic" ? ["generic"] : [scope, "generic"];
  try {
    const rows = await db
      .select({
        id: templates.id,
        name: templates.name,
        body: templates.body,
      })
      .from(templates)
      .where(inArray(templates.scope, scopes))
      .orderBy(asc(templates.name));
    return rows;
  } catch (err) {
    console.error("[templates] fetch failed:", err);
    return [];
  }
}

// kept for symmetry — explicit `eq` import would be unused otherwise
void eq;
