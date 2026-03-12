export type Stance = "IMMOVABLE" | "FIRM" | "SKEPTICAL" | "RELUCTANT" | "CONCEDE";

export type Intent = "want" | "need" | "replace" | "upgrade" | "gift";

export type PricePositioning = "budget" | "standard" | "premium" | "luxury";

export interface TurnAssessment {
  // Context (every turn, can evolve)
  item: string;
  estimated_price: number;
  category: string;
  intent: Intent;
  price_positioning: PricePositioning;
  // Debate quality (turn 2+, defaults on turn 1)
  challenge_addressed: boolean;
  evidence_provided: boolean;
  new_angle: boolean;
  emotional_reasoning: boolean;
  challenge_topic: string;
  // Flags (every turn)
  is_non_answer: boolean;
  is_out_of_scope: boolean;
  user_backed_down: boolean;
  is_directed_question: boolean;
}

export interface TurnSummary {
  turn: number;
  delta: number;
  topic: string;
  addressed: boolean;
  evidence: boolean;
}

export interface ScoringResult {
  runningScore: number;
  delta: number;
  stance: Stance;
  thresholdMultiplier: number;
  priceModifier: number;
  positioningModifier: number;
}

// --- Intent starting bonus (turn 1 only) ---

const INTENT_STARTING_SCORE: Record<Intent, number> = {
  replace: 8,
  need: 5,
  upgrade: 3,
  gift: 2,
  want: 0,
};

export function getStartingScore(intent: Intent): number {
  return INTENT_STARTING_SCORE[intent] ?? 0;
}

// --- Debate delta calculation ---

export function computeTurnDelta(assessment: TurnAssessment): number {
  if (assessment.is_non_answer) return -5;

  let delta = 0;

  if (assessment.challenge_addressed) {
    delta = 8;
    if (assessment.evidence_provided) delta += 5;
    if (assessment.new_angle) delta += 3;
  } else {
    if (assessment.evidence_provided) delta += 2;
    if (assessment.new_angle) delta += 1;
  }

  if (assessment.emotional_reasoning) delta -= 3;

  return delta;
}

// --- Stance thresholds (lower than v2 — score builds incrementally) ---

const STANCE_THRESHOLDS: [number, Stance][] = [
  [8, "IMMOVABLE"],
  [18, "FIRM"],
  [30, "SKEPTICAL"],
  [42, "RELUCTANT"],
];
// 43+ → CONCEDE

export function determineStance(score: number, thresholdMultiplier: number): Stance {
  for (const [baseThreshold, stance] of STANCE_THRESHOLDS) {
    if (score <= baseThreshold * thresholdMultiplier) return stance;
  }
  return "CONCEDE";
}

// --- Guardrails (unchanged from v2) ---

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

// --- Price modifier (same formula as v2) ---

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function computePriceModifier(price: number | undefined): number {
  if (price == null || price <= 0) return 1.0;
  return clamp(1.0 + 0.3 * Math.log(price / 100), 0.6, 1.5);
}

// --- Positioning modifier ---

const POSITIONING_MAP: Record<PricePositioning, number> = {
  budget: 0.85,
  standard: 1.0,
  premium: 1.15,
  luxury: 1.3,
};

export function getPositioningModifier(positioning: PricePositioning | undefined): number {
  return POSITIONING_MAP[positioning ?? "standard"] ?? 1.0;
}
