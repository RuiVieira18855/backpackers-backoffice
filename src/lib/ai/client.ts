import "server-only";
import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.ANTHROPIC_API_KEY;

let cached: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local to enable the AI copilot.",
    );
  }
  if (!cached) {
    cached = new Anthropic({ apiKey });
  }
  return cached;
}

export function isAiEnabled(): boolean {
  return Boolean(apiKey);
}

export const AI_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";
export const AI_MAX_TOKENS = 1024;
