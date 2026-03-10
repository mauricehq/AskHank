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

// --- Assessment types (LLM extracts these classifications) ---

export type Intent = "want" | "need" | "replace" | "upgrade" | "gift";
export type CurrentSolution = "none" | "broken" | "failing" | "outdated" | "working" | "unknown";
export type AlternativesTried = "exhausted" | "some" | "none" | "unknown";
export type Frequency = "daily" | "weekly" | "monthly" | "rarely" | "unknown";
export type Urgency = "immediate" | "soon" | "none" | "unknown";
export type PurchaseHistory = "impulse_pattern" | "planned" | "unknown";
export type Specificity = "vague" | "moderate" | "specific" | "evidence";
export type Consistency = "building" | "consistent" | "contradicting" | "first_turn";
export type Beneficiary = "self" | "shared" | "dependent" | "gift_discretionary";

export interface Assessment {
  item: string;
  intent: Intent;
  current_solution: CurrentSolution;
  current_solution_detail: string | null;
  alternatives_tried: AlternativesTried;
  alternatives_detail: string | null;
  frequency: Frequency;
  urgency: Urgency;
  urgency_detail: string | null;
  purchase_history: PurchaseHistory;
  emotional_triggers: string[];
  specificity: Specificity;
  consistency: Consistency;
  beneficiary: Beneficiary;
}

// --- Deterministic mapping tables ---

const FUNCTIONAL_GAP_MAP: Record<Intent, Record<CurrentSolution, number>> = {
  replace: { broken: 9, failing: 7, outdated: 5, none: 6, working: 2, unknown: 6 },
  need:    { broken: 8, failing: 7, outdated: 6, none: 8, working: 4, unknown: 6 },
  upgrade: { broken: 2, failing: 2, outdated: 2, none: 2, working: 2, unknown: 2 },
  want:    { broken: 0, failing: 0, outdated: 0, none: 0, working: 0, unknown: 0 },
  gift:    { broken: 3, failing: 3, outdated: 3, none: 3, working: 3, unknown: 3 },
};

const CURRENT_STATE_MAP: Record<CurrentSolution, number> = {
  broken: 9, failing: 6, outdated: 3, working: 0, none: 5, unknown: 0,
};

const ALTERNATIVES_MAP: Record<AlternativesTried, number> = {
  exhausted: 9, some: 5, none: 1, unknown: 0,
};

const FREQUENCY_MAP: Record<Frequency, number> = {
  daily: 9, weekly: 6, monthly: 3, rarely: 1, unknown: 0,
};

const BENEFICIARY_FUNCTIONAL_GAP: Record<Beneficiary, number> = {
  self: 1.0,
  shared: 1.3,
  dependent: 1.5,
  gift_discretionary: 0.5,
};

const BENEFICIARY_FREQUENCY: Record<Beneficiary, number> = {
  self: 1.0,
  shared: 1.2,
  dependent: 1.3,
  gift_discretionary: 0.7,
};

const URGENCY_MAP: Record<Urgency, number> = {
  immediate: 9, soon: 5, none: 0, unknown: 0,
};

const PURCHASE_HISTORY_MAP: Record<PurchaseHistory, number> = {
  impulse_pattern: 1, planned: 7, unknown: 3,
};

function emotionalScore(triggers: string[]): number {
  const count = triggers.length;
  if (count === 0) return 0;
  if (count === 1) return -3;
  if (count === 2) return -5;
  return -8;
}

const SPECIFICITY_MAP: Record<Specificity, number> = {
  vague: 0.4, moderate: 0.8, specific: 1.2, evidence: 1.5,
};

const CONSISTENCY_MAP: Record<Consistency, number> = {
  building: 1.2, consistent: 1.0, contradicting: 0.3, first_turn: 1.0,
};

export function mapAssessmentToScores(assessment: Assessment): ExtractedScores {
  const bfGap = BENEFICIARY_FUNCTIONAL_GAP[assessment.beneficiary] ?? 1.0;
  const bfFreq = BENEFICIARY_FREQUENCY[assessment.beneficiary] ?? 1.0;

  return {
    functional_gap: Math.min(
      (FUNCTIONAL_GAP_MAP[assessment.intent]?.[assessment.current_solution] ?? 0) * bfGap,
      10
    ),
    current_state: CURRENT_STATE_MAP[assessment.current_solution] ?? 0,
    alternatives_owned: ALTERNATIVES_MAP[assessment.alternatives_tried] ?? 0,
    frequency_of_use: Math.min(
      (FREQUENCY_MAP[assessment.frequency] ?? 0) * bfFreq,
      10
    ),
    urgency: URGENCY_MAP[assessment.urgency] ?? 0,
    pattern_history: PURCHASE_HISTORY_MAP[assessment.purchase_history] ?? 3,
    emotional_reasoning: emotionalScore(assessment.emotional_triggers ?? []),
    specificity: SPECIFICITY_MAP[assessment.specificity] ?? 1.0,
    consistency: CONSISTENCY_MAP[assessment.consistency] ?? 1.0,
  };
}

const STANCE_ORDER: Stance[] = ["IMMOVABLE", "FIRM", "SKEPTICAL", "RELUCTANT", "CONCEDE"];

export function applyStanceGuardrails(
  computedStance: Stance,
  previousStance: Stance,
  turnCount: number
): Stance {
  let stance = computedStance;

  // Floor: turns 1-2, minimum stance is FIRM
  if (turnCount <= 2 && stance === "IMMOVABLE") {
    stance = "FIRM";
  }

  // Pace cap: can only advance one level per turn
  const prevIndex = STANCE_ORDER.indexOf(previousStance);
  const newIndex = STANCE_ORDER.indexOf(stance);
  if (newIndex > prevIndex + 1) {
    stance = STANCE_ORDER[prevIndex + 1];
  }

  return stance;
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
