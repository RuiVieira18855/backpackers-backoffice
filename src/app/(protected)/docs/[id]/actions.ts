"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { requireSkill } from "@/lib/dal";
import { logAudit } from "@/lib/audit";
import { supabaseAdmin, DOCUMENTS_BUCKET } from "@/lib/supabase/admin";

export async function deleteDocument(id: string): Promise<void> {
  const profile = await requireSkill("docs");

  const before = await db.query.documents.findFirst({
    where: eq(documents.id, id),
  });
  if (!before) {
    redirect("/docs");
  }

  // Remove from Storage first; if it fails we keep the DB row so the user
  // can retry. Ignore "not found" since the bucket might've drifted.
  const { error: storageError } = await supabaseAdmin.storage
    .from(DOCUMENTS_BUCKET)
    .remove([before.storagePath]);

  if (storageError && !/not.found/i.test(storageError.message)) {
    throw new Error(`Storage delete failed: ${storageError.message}`);
  }

  await db.delete(documents).where(eq(documents.id, id));

  await logAudit({
    userId: profile.id,
    pillarId: before.pillarId,
    entityType: "document",
    entityId: id,
    action: "delete",
    diff: { snapshot: before },
  });

  redirect("/docs");
}
