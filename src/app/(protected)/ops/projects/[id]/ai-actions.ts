"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects, tasks } from "@/lib/db/schema";
import { requireProfile } from "@/lib/dal";
import { generateText } from "@/lib/ai/generate";

export type AiActionResult =
  | { ok: true; text: string }
  | { ok: false; error: string; code?: string };

const SYSTEM = `You are the Backpackers Outpost project copilot.
Given a project snapshot and its current task list, produce a short breakdown of what is still missing to move the project forward.
Rules:
- Match the project's own language (Portuguese, English, or Spanish).
- Do NOT repeat tasks that already exist — only propose gaps.
- Structure: one sentence stating the biggest gap, then a numbered list of 3-5 concrete task titles (short, imperative, actionable).
- Each proposed task on its own line, starting with a verb.
- If the task list is already comprehensive, say so and suggest a single next milestone check-in instead.`;

export async function suggestProjectTasks(
  projectId: string,
): Promise<AiActionResult> {
  const profile = await requireProfile();

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    with: {
      pillar: { columns: { name: true } },
      clientContact: { columns: { fullName: true, company: true } },
    },
  });
  if (!project) return { ok: false, error: "Project not found" };

  const existingTasks = await db.query.tasks.findMany({
    where: eq(tasks.projectId, projectId),
    columns: { title: true, status: true },
    limit: 50,
  });

  const parts: string[] = [];
  parts.push(`Project: ${project.name}`);
  parts.push(`Pillar: ${project.pillar?.name ?? "—"}`);
  parts.push(`Status: ${project.status}`);
  if (project.clientContact) {
    parts.push(
      `Client: ${project.clientContact.fullName}${project.clientContact.company ? ` (${project.clientContact.company})` : ""}`,
    );
  }
  if (project.description) parts.push(`Description: ${project.description}`);
  if (existingTasks.length === 0) {
    parts.push("Existing tasks: (none)");
  } else {
    parts.push("Existing tasks:");
    for (const t of existingTasks) {
      parts.push(`- [${t.status}] ${t.title}`);
    }
  }

  const result = await generateText({
    userId: profile.id,
    pillarId: project.pillarId,
    surface: "project.suggest_tasks",
    entityType: "project",
    entityId: project.id,
    system: SYSTEM,
    user: parts.join("\n"),
    maxTokens: 800,
  });

  if (!result.ok) {
    return { ok: false, error: result.message, code: result.code };
  }
  return { ok: true, text: result.text };
}
