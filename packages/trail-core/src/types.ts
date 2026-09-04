export type TrailValueKey = "T" | "R" | "I" | "L" | "H" | "A";

export const TRAIL_VALUE_KEYS: TrailValueKey[] = [
  "T",
  "R",
  "I",
  "L",
  "H",
  "A",
];

export const TRAIL_VALUE_LABELS: Record<TrailValueKey, string> = {
  T: "Transformação",
  R: "Respeito",
  I: "Inovação",
  L: "Liberdade",
  H: "Harmonia",
  A: "Aventura",
};

export type TrailScores = Record<TrailValueKey, number>;

export type ScoredAnswer = {
  value: TrailValueKey;
  likert: number;
  reverseScored: boolean;
};

export type ScoreBand = "low" | "mid" | "high";
