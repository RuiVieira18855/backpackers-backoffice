/**
 * Anthropic model pricing (USD per 1M tokens).
 * Update when Anthropic changes public rates.
 *
 * Source: docs.anthropic.com/en/docs/about-claude/models#model-comparison
 */

export type ModelPrice = { inputUsd: number; outputUsd: number };

const EXACT: Record<string, ModelPrice> = {
  // Haiku family
  "claude-haiku-4-5-20251001": { inputUsd: 1, outputUsd: 5 },
  "claude-haiku-4-5": { inputUsd: 1, outputUsd: 5 },
  // Sonnet family
  "claude-sonnet-5": { inputUsd: 3, outputUsd: 15 },
  "claude-sonnet-4-6": { inputUsd: 3, outputUsd: 15 },
  "claude-sonnet-4-5": { inputUsd: 3, outputUsd: 15 },
  // Opus family
  "claude-opus-4-8": { inputUsd: 5, outputUsd: 25 },
  "claude-opus-4-7": { inputUsd: 5, outputUsd: 25 },
  // Fable
  "claude-fable-5": { inputUsd: 5, outputUsd: 25 },
};

const FAMILY_FALLBACK: Array<{ prefix: string; price: ModelPrice }> = [
  { prefix: "claude-haiku", price: { inputUsd: 1, outputUsd: 5 } },
  { prefix: "claude-sonnet", price: { inputUsd: 3, outputUsd: 15 } },
  { prefix: "claude-opus", price: { inputUsd: 5, outputUsd: 25 } },
  { prefix: "claude-fable", price: { inputUsd: 5, outputUsd: 25 } },
];

const DEFAULT_PRICE: ModelPrice = { inputUsd: 3, outputUsd: 15 };

// USD → EUR conversion (approximate; adjust if you have live FX)
const USD_TO_EUR = 0.92;

export function priceForModel(model: string): ModelPrice {
  if (EXACT[model]) return EXACT[model];
  for (const f of FAMILY_FALLBACK) {
    if (model.startsWith(f.prefix)) return f.price;
  }
  return DEFAULT_PRICE;
}

/**
 * Cost in EUR for a given token bundle at the given model's rate.
 */
export function costEur(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const p = priceForModel(model);
  const usd =
    (inputTokens / 1_000_000) * p.inputUsd +
    (outputTokens / 1_000_000) * p.outputUsd;
  return usd * USD_TO_EUR;
}

export function formatEur(eur: number): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(eur);
}
