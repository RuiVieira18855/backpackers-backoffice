import "server-only";
import { db } from "@/lib/db";
import { aiUsage } from "@/lib/db/schema";
import { AI_MAX_TOKENS, AI_MODEL, getAnthropic } from "./client";

const RATE_WINDOW_MS = 60_000;
const RATE_MAX_PER_WINDOW = 20;

type RateEntry = { count: number; resetAt: number };
const rateMap = new Map<string, RateEntry>();

function rateLimit(userId: string) {
  const now = Date.now();
  const entry = rateMap.get(userId);
  if (!entry || entry.resetAt <= now) {
    rateMap.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { ok: true as const };
  }
  if (entry.count >= RATE_MAX_PER_WINDOW) {
    return { ok: false as const, retryAfterMs: entry.resetAt - now };
  }
  entry.count += 1;
  return { ok: true as const };
}

export type GenerateInput = {
  userId: string;
  pillarId?: string | null;
  surface: string;
  entityType?: string;
  entityId?: string;
  system: string;
  user: string;
  maxTokens?: number;
  meta?: Record<string, unknown>;
};

export type GenerateResult =
  | { ok: true; text: string; usage: { input: number; output: number } }
  | {
      ok: false;
      code: "not_configured" | "rate_limited" | "provider_error";
      message: string;
      retryAfterMs?: number;
    };

export async function generateText(
  input: GenerateInput,
): Promise<GenerateResult> {
  const rate = rateLimit(input.userId);
  if (!rate.ok) {
    return {
      ok: false,
      code: "rate_limited",
      message: `AI rate limit hit. Retry in ${Math.ceil(rate.retryAfterMs / 1000)}s.`,
      retryAfterMs: rate.retryAfterMs,
    };
  }

  const startedAt = Date.now();
  try {
    const anthropic = getAnthropic();
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: input.maxTokens ?? AI_MAX_TOKENS,
      system: input.system,
      messages: [{ role: "user", content: input.user }],
    });

    const latencyMs = Date.now() - startedAt;
    const textBlock = response.content.find((b) => b.type === "text");
    const text = textBlock && "text" in textBlock ? textBlock.text : "";

    await db.insert(aiUsage).values({
      userId: input.userId,
      pillarId: input.pillarId ?? null,
      surface: input.surface,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      model: response.model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      latencyMs,
      ok: "true",
      meta: input.meta ?? null,
    });

    return {
      ok: true,
      text,
      usage: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - startedAt;
    const message = err instanceof Error ? err.message : "Unknown error";
    const isMissingKey = message.includes("ANTHROPIC_API_KEY");

    await db
      .insert(aiUsage)
      .values({
        userId: input.userId,
        pillarId: input.pillarId ?? null,
        surface: input.surface,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        model: AI_MODEL,
        inputTokens: 0,
        outputTokens: 0,
        latencyMs,
        ok: "false",
        errorCode: isMissingKey ? "not_configured" : "provider_error",
        meta: { message, ...(input.meta ?? {}) },
      })
      .catch(() => undefined);

    return {
      ok: false,
      code: isMissingKey ? "not_configured" : "provider_error",
      message,
    };
  }
}
