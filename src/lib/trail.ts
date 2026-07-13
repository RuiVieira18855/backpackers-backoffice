import "server-only";
import type { TrailValueKey } from "@/lib/db/schema";
import { TRAIL_VALUE_KEYS } from "@/lib/db/schema";

/**
 * Convert a raw sum of Likert answers into a normalised 0-100 score.
 *
 * Each value has 7 questions, each Likert 1-5. Raw range is 7..35.
 * Reverse-scored items are inverted before summing (6 - likert).
 * Normalised = (raw - 7) / 28 * 100  →  0..100.
 */
export function normaliseScore(rawSum: number, itemCount: number): number {
  const min = itemCount * 1;
  const max = itemCount * 5;
  if (max === min) return 0;
  const clamped = Math.max(min, Math.min(max, rawSum));
  return Math.round(((clamped - min) / (max - min)) * 100);
}

export type ScoredAnswer = {
  value: TrailValueKey;
  likert: number;
  reverseScored: boolean;
};

export type TrailScores = Record<TrailValueKey, number>;

export function computeScores(answers: ScoredAnswer[]): TrailScores {
  const grouped: Record<TrailValueKey, { sum: number; count: number }> = {
    T: { sum: 0, count: 0 },
    R: { sum: 0, count: 0 },
    I: { sum: 0, count: 0 },
    L: { sum: 0, count: 0 },
    H: { sum: 0, count: 0 },
    A: { sum: 0, count: 0 },
  };

  for (const a of answers) {
    const effective = a.reverseScored ? 6 - a.likert : a.likert;
    grouped[a.value].sum += effective;
    grouped[a.value].count += 1;
  }

  const result: TrailScores = { T: 0, R: 0, I: 0, L: 0, H: 0, A: 0 };
  for (const k of TRAIL_VALUE_KEYS) {
    const g = grouped[k];
    result[k] = g.count === 0 ? 0 : normaliseScore(g.sum, g.count);
  }
  return result;
}

export function dominantValue(scores: TrailScores): TrailValueKey {
  let best: TrailValueKey = "T";
  let bestScore = -1;
  for (const k of TRAIL_VALUE_KEYS) {
    if (scores[k] > bestScore) {
      bestScore = scores[k];
      best = k;
    }
  }
  return best;
}

export function sortedByScore(scores: TrailScores): Array<{
  value: TrailValueKey;
  score: number;
}> {
  return TRAIL_VALUE_KEYS.map((v) => ({ value: v, score: scores[v] })).sort(
    (a, b) => b.score - a.score,
  );
}
