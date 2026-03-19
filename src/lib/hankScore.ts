export const HANK_SCORE_LABELS: Record<number, string> = {
  1: "Pure impulse",
  2: "Pure impulse",
  3: "Gut feeling",
  4: "Gut feeling",
  5: "Half-examined",
  6: "Half-examined",
  7: "Well-considered",
  8: "Well-considered",
  9: "Thoroughly examined",
  10: "Thoroughly examined",
};

export function getHankScoreLabel(score: number): string {
  return HANK_SCORE_LABELS[score] ?? "Unknown";
}
