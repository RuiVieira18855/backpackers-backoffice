"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { deals } from "@/lib/db/schema";
import { requireProfile } from "@/lib/dal";
import { generateText } from "@/lib/ai/generate";

export type AiActionResult =
  | { ok: true; text: string }
  | { ok: false; error: string; code?: string };

const SYSTEM = `You are the Backpackers Outpost sales copilot.
Your job: read a deal snapshot and produce a short, direct next-step brief for the operator.
Rules:
- Match the deal's own language (Portuguese, English, or Spanish).
- Be concrete and specific. No fluff.
- Structure: 2-3 sentence summary, then a numbered list of 2-3 next actions (each starting with a verb).
- If context is thin, say so and suggest what info to gather first.
- Never invent facts about the contact or the numbers.`;

export async function suggestDealNextSteps(
  dealId: string,
): Promise<AiActionResult> {
  const profile = await requireProfile();

  const deal = await db.query.deals.findFirst({
    where: eq(deals.id, dealId),
    with: {
      contact: {
        columns: { fullName: true, company: true, jobTitle: true, email: true },
      },
      pillar: { columns: { name: true } },
    },
  });
  if (!deal) return { ok: false, error: "Deal not found" };

  const parts: string[] = [];
  parts.push(`Deal: ${deal.name}`);
  parts.push(`Pillar: ${deal.pillar?.name ?? "—"}`);
  parts.push(`Stage: ${deal.stage}`);
  if (deal.value) parts.push(`Value: ${deal.value} ${deal.currency}`);
  if (deal.expectedCloseDate)
    parts.push(`Expected close: ${deal.expectedCloseDate}`);
  if (deal.contact) {
    const c = deal.contact;
    parts.push(
      `Contact: ${c.fullName}${c.jobTitle ? ` (${c.jobTitle})` : ""}${c.company ? ` — ${c.company}` : ""}`,
    );
  }
  if (deal.description) parts.push(`Description: ${deal.description}`);
  if (deal.notes) parts.push(`Notes: ${deal.notes}`);

  const result = await generateText({
    userId: profile.id,
    pillarId: deal.pillarId,
    surface: "deal.next_steps",
    entityType: "deal",
    entityId: deal.id,
    system: SYSTEM,
    user: parts.join("\n"),
    maxTokens: 700,
  });

  if (!result.ok) {
    return { ok: false, error: result.message, code: result.code };
  }
  return { ok: true, text: result.text };
}
