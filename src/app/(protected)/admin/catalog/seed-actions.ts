"use server";

import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { catalogActivities } from "@/lib/db/schema";
import { requireRole } from "@/lib/dal";
import { logAudit } from "@/lib/audit";
import { SYNERGY_SEED } from "@/data/synergy-seed";

export type SeedResult =
  | { ok: true; inserted: number; updated: number }
  | { ok: false; error: string };

/**
 * Imports the 17 Synergy activities from src/data/synergy-seed.ts (auto-
 * generated from ../estrategia/synergy/guias/*.md). Idempotent — upsert on
 * `code`. Only super_user + admin_grupo can trigger.
 */
export async function seedSynergyActivities(): Promise<SeedResult> {
  const profile = await requireRole("admin_grupo");

  let inserted = 0;
  let updated = 0;

  try {
    for (const a of SYNERGY_SEED) {
      const existing = await db.query.catalogActivities.findFirst({
        where: (t, { eq }) => eq(t.code, a.code),
      });

      if (existing) {
        await db
          .update(catalogActivities)
          .set({
            name: a.name,
            tagline: a.tagline,
            family: a.family,
            durationLabel: a.durationLabel,
            paxMin: a.paxMin,
            paxMax: a.paxMax,
            pricePerPaxMin: a.pricePerPaxMin,
            pricePerPaxMax: a.pricePerPaxMax,
            priceTargetMin: a.priceTargetMin,
            priceTargetMax: a.priceTargetMax,
            targetAudience: a.targetAudience,
            body: a.body,
            sortOrder: a.sortOrder,
            updatedBy: profile.id,
            updatedAt: new Date(),
          })
          .where(sql`${catalogActivities.code} = ${a.code}`);
        updated++;
      } else {
        await db.insert(catalogActivities).values({
          code: a.code,
          name: a.name,
          tagline: a.tagline,
          family: a.family,
          durationLabel: a.durationLabel,
          paxMin: a.paxMin,
          paxMax: a.paxMax,
          pricePerPaxMin: a.pricePerPaxMin,
          pricePerPaxMax: a.pricePerPaxMax,
          priceTargetMin: a.priceTargetMin,
          priceTargetMax: a.priceTargetMax,
          targetAudience: a.targetAudience,
          body: a.body,
          sortOrder: a.sortOrder,
          isActive: true,
          createdBy: profile.id,
          updatedBy: profile.id,
        });
        inserted++;
      }
    }

    await logAudit({
      userId: profile.id,
      pillarId: null,
      entityType: "catalog_activity",
      entityId: null,
      action: "update",
      diff: {
        seed: "synergy",
        inserted,
        updated,
        total: SYNERGY_SEED.length,
      },
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  revalidatePath("/admin/catalog");
  revalidatePath("/library");
  return { ok: true, inserted, updated };
}
