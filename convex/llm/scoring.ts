export type Stance = "IMMOVABLE" | "FIRM" | "SKEPTICAL" | "RELUCTANT" | "CONCEDE";

export interface ExtractedScores {
  functional_gap: number;
  current_state: number;
  alternatives_owned: number;
  frequency_of_use: number;
  urgency: number;
  pattern_history: number;
  emotional_reasoning: number;
  specificity: number;
  consistency: number;
}

export interface ScoringResult {
  rawScore: number;
  score: number;
  stance: Stance;
  thresholdMultiplier: number;
}

// Weights
const HEAVY = 3.0;
const MEDIUM = 1.5;
const NEGATIVE = 2.0;

// Price modifier brackets
const PRICE_MODIFIERS: [number, number][] = [
  [15, 0.6],
  [50, 0.8],
  [200, 1.0],
  [500, 1.2],
  [Infinity, 1.4],
];

// Category modifiers
const CATEGORY_MODIFIERS: Record<string, number> = {
  cars: 1.5,
  electronics: 1.3,
  fashion: 1.2,
  furniture: 1.1,
  essentials: 1.0,
  safety_health: 0.8,
  other: 1.0,
};

// Base stance thresholds (upper bound for each stance)
const STANCE_THRESHOLDS: [number, Stance][] = [
  [30, "IMMOVABLE"],
  [50, "FIRM"],
  [70, "SKEPTICAL"],
  [85, "RELUCTANT"],
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getPriceModifier(price: number | undefined): number {
  if (price == null || price <= 0) return 1.0;
  for (const [threshold, modifier] of PRICE_MODIFIERS) {
    if (price < threshold) return modifier;
  }
  return 1.4;
}

function getCategoryModifier(category: string | undefined): number {
  if (!category) return 1.0;
  return CATEGORY_MODIFIERS[category] ?? 1.0;
}

function determineStance(score: number, thresholdMultiplier: number): Stance {
  for (const [baseThreshold, stance] of STANCE_THRESHOLDS) {
    if (score <= baseThreshold * thresholdMultiplier) {
      return stance;
    }
  }
  return "CONCEDE";
}

export function computeScore(
  scores: ExtractedScores,
  estimatedPrice?: number,
  category?: string
): ScoringResult {
  // Heavy factors (0-10 each)
  const heavySum =
    clamp(scores.functional_gap, 0, 10) +
    clamp(scores.current_state, 0, 10) +
    clamp(scores.alternatives_owned, 0, 10);

  // Medium factors (0-10 each)
  const mediumSum =
    clamp(scores.frequency_of_use, 0, 10) +
    clamp(scores.urgency, 0, 10) +
    clamp(scores.pattern_history, 0, 10);

  // Negative factor (0 to -10, always <= 0)
  const emotional = clamp(scores.emotional_reasoning, -10, 0);

  // Multipliers
  const specificity = clamp(scores.specificity, 0.3, 1.5);
  const consistency = clamp(scores.consistency, 0.0, 1.2);

  const weightedSum =
    heavySum * HEAVY + mediumSum * MEDIUM + emotional * NEGATIVE;

  const rawScore = weightedSum * specificity * consistency;
  const score = clamp(Math.round(rawScore), 0, 100);

  const priceModifier = getPriceModifier(estimatedPrice);
  const categoryModifier = getCategoryModifier(category);
  const thresholdMultiplier = priceModifier * categoryModifier;

  const stance = determineStance(score, thresholdMultiplier);

  return { rawScore, score, stance, thresholdMultiplier };
}
