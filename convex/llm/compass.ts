"use node";

import type { MemoryNudge } from "./memory";

// === Enums ===

export type Intensity = "CURIOUS" | "PROBING" | "POINTED" | "WRAPPING";
export type Intent = "want" | "need" | "replace" | "upgrade" | "gift";

export type Territory =
  | "trigger"
  | "current_solution"
  | "usage_reality"
  | "real_cost"
  | "pattern"
  | "alternatives"
  | "emotional_check";

export type TerritoryDepth = "unexplored" | "touched" | "explored" | "settled";
export type Decision = "buying" | "skipping" | "thinking";

export type ResponseType = "direct_counter" | "partial" | "pivot" | "dodge" | "none";
export type EvidenceTier = "none" | "assertion" | "anecdotal" | "specific" | "concrete";
export type ArgumentType =
  | "same_as_before"
  | "new_usage"
  | "new_deficiency"
  | "new_financial"
  | "new_comparison"
  | "new_other";

export type ContradictionSeverity = "refinement" | "soft" | "hard";

// === Structures ===

export interface TerritoryState {
  depth: TerritoryDepth;
  bestEvidence: EvidenceTier;
  relevant: boolean;
  turnFirstExplored?: number;
}

export type CoverageMap = Record<Territory, TerritoryState>;

export interface DetectedContradiction {
  territory: Territory;
  prior_claim: string;
  current_claim: string;
  reasoning: string;
  severity: ContradictionSeverity;
}

export interface StoredContradiction {
  territory: Territory;
  turnDetected: number;
  priorClaim: string;
  currentClaim: string;
  severity: "soft" | "hard"; // refinements not stored
  resolved: boolean;
  turnResolved?: number;
}

// === Assessment (LLM Call 1 output) ===

export interface TurnAssessment {
  // Context (turn 1)
  item: string;
  estimated_price: number;
  category: string;
  intent: Intent;
  // CoT
  hanks_question: string;
  // Coverage
  territory_addressed: Territory | "other";
  // Engagement quality
  response_type: ResponseType;
  evidence_tier: EvidenceTier;
  argument_type: ArgumentType;
  emotional_reasoning: boolean;
  // Contradiction
  contradiction: DetectedContradiction | null;
  // Flags
  is_non_answer: boolean;
  is_out_of_scope: boolean;
  user_resolved: "buying" | "skipping" | null;
  is_directed_question: boolean;
  // Trace
  challenge_topic: string;
}

// === Turn Summary (per-turn record in PersistedContext) ===

export interface TurnSummary {
  turn: number;
  territoryTargeted: Territory | null;
  territoryAddressed: Territory | "other";
  responseType: ResponseType;
  evidenceTier: EvidenceTier;
  argumentType: ArgumentType;
  emotionalReasoning: boolean;
  contradictionDetected?: ContradictionSeverity;
  topic: string;
}

// === Persisted Context (stored in lastAssessment JSON) ===

export interface PersistedContext {
  item: string;
  estimated_price: number;
  category: string;
  intent: Intent;
  coverageMap: CoverageMap;
  turnSummaries: TurnSummary[];
  contradictions: StoredContradiction[];
  consecutiveNonAnswers: number;
  consecutiveLowEngagement: number;
  turnsSinceCoverageAdvanced: number;
  territoryAssignmentCounts: Partial<Record<Territory, number>>;
  lastAssignedTerritory: Territory | null;
  memoryNudgeText?: string;
  memoryNudges?: MemoryNudge[];
}

// === Compass Result (returned to prompt builder) ===

export interface CompassResult {
  intensity: Intensity;
  previousIntensity: Intensity;
  coverageMap: CoverageMap;
  nextTerritory: Territory | null;
  territoryExhausted?: Territory;
  coverageRatio: number;
  turnCount: number;
  turnsSinceCoverageAdvanced: number;
  decisionType: string;
  // For prompt builder
  intensityGuidance: string;
  territoryGuidance: string;
  examinationProgress: string;
}

// === Hank Score (calculated at resolution) ===

export interface HankScoreResult {
  score: number; // 1-10
  label: string;
  coverageRatio: number;
  breadthScore: number;
  depthScore: number;
  engagementScore: number;
  strongestTerritory?: Territory;
  weakestTerritory?: Territory;
}

// === Constants ===

export const INTENSITY_ORDER: Intensity[] = ["CURIOUS", "PROBING", "POINTED", "WRAPPING"];

export const ALL_TERRITORIES: Territory[] = [
  "trigger",
  "current_solution",
  "usage_reality",
  "real_cost",
  "pattern",
  "alternatives",
  "emotional_check",
];

export const TERRITORY_RELEVANCE: Record<Intent, Record<Territory, string>> = {
  want: {
    trigger: "required",
    current_solution: "required",
    usage_reality: "required",
    real_cost: "required",
    pattern: "required",
    alternatives: "relevant",
    emotional_check: "required",
  },
  need: {
    trigger: "relevant",
    current_solution: "required",
    usage_reality: "relevant",
    real_cost: "relevant",
    pattern: "skip",
    alternatives: "relevant",
    emotional_check: "skip",
  },
  replace: {
    trigger: "skip",
    current_solution: "partial",
    usage_reality: "relevant",
    real_cost: "required",
    pattern: "skip",
    alternatives: "relevant",
    emotional_check: "skip",
  },
  upgrade: {
    trigger: "relevant",
    current_solution: "required",
    usage_reality: "relevant",
    real_cost: "required",
    pattern: "relevant",
    alternatives: "required",
    emotional_check: "relevant",
  },
  gift: {
    trigger: "skip",
    current_solution: "skip",
    usage_reality: "relevant",
    real_cost: "relevant",
    pattern: "skip",
    alternatives: "relevant",
    emotional_check: "relevant",
  },
};

export const HANK_SCORE_LABELS: Record<string, string> = {
  "1": "Pure impulse",
  "2": "Pure impulse",
  "3": "Gut feeling",
  "4": "Gut feeling",
  "5": "Half-examined",
  "6": "Half-examined",
  "7": "Well-considered",
  "8": "Well-considered",
  "9": "Thoroughly examined",
  "10": "Thoroughly examined",
};

const TERRITORY_LABELS: Record<Territory, string> = {
  trigger: "What triggered this",
  current_solution: "Current solution",
  usage_reality: "Usage reality",
  real_cost: "Real cost",
  pattern: "Spending pattern",
  alternatives: "Alternatives",
  emotional_check: "Emotional check",
};

const EVIDENCE_VALUES: Record<EvidenceTier, number> = {
  none: 0,
  assertion: 0,
  anecdotal: 1,
  specific: 2.5,
  concrete: 4,
};

const ENGAGEMENT_VALUES: Record<ResponseType, number> = {
  direct_counter: 4,
  partial: 2,
  pivot: 0,
  dodge: -1,
  none: -2,
};

const DEPTH_ORDER: TerritoryDepth[] = ["unexplored", "touched", "explored", "settled"];

function depthIndex(d: TerritoryDepth): number {
  return DEPTH_ORDER.indexOf(d);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function evidenceIndex(e: EvidenceTier): number {
  const order: EvidenceTier[] = ["none", "assertion", "anecdotal", "specific", "concrete"];
  return order.indexOf(e);
}

// === Pure Functions ===

/**
 * Creates a 7-territory coverage map with relevance set by intent.
 * `replace` intent: `current_solution` starts at `touched` (partial).
 */
export function initCoverageMap(intent: Intent): CoverageMap {
  const relevance = TERRITORY_RELEVANCE[intent];
  const map = {} as CoverageMap;

  for (const territory of ALL_TERRITORIES) {
    const rel = relevance[territory];
    const relevant = rel !== "skip";
    // replace intent: current_solution starts at touched
    const startDepth: TerritoryDepth =
      intent === "replace" && territory === "current_solution" ? "touched" : "unexplored";

    map[territory] = {
      depth: startDepth,
      bestEvidence: "none",
      relevant,
    };
  }

  return map;
}

/**
 * Updates the coverage map based on this turn's assessment.
 * Handles contradictions (degrade on hard), depth updates, and pivots.
 */
export function updateCoverage(
  coverageMap: CoverageMap,
  assessment: TurnAssessment,
  targetTerritory: Territory | null,
  turnCount: number
): CoverageMap {
  const map = JSON.parse(JSON.stringify(coverageMap)) as CoverageMap;
  const addressed = assessment.territory_addressed;

  // Step 1: Handle contradiction (degrade on hard)
  if (assessment.contradiction && assessment.contradiction.severity === "hard") {
    const ct = assessment.contradiction.territory;
    if (ct && map[ct]) {
      const current = depthIndex(map[ct].depth);
      if (current >= 2) {
        // explored → touched, settled → explored
        map[ct].depth = DEPTH_ORDER[current - 1];
      }
    }
  }

  // Step 2: Update addressed territory depth + bestEvidence
  if (addressed && addressed !== "other" && map[addressed]) {
    const state = map[addressed];
    const rt = assessment.response_type;
    const et = assessment.evidence_tier;

    // Compute new depth from response quality
    let newDepth: TerritoryDepth;
    if (rt === "direct_counter" && evidenceIndex(et) >= evidenceIndex("specific")) {
      newDepth = "settled";
    } else if (rt === "direct_counter" && evidenceIndex(et) >= evidenceIndex("anecdotal")) {
      newDepth = "explored";
    } else if (rt === "partial" && evidenceIndex(et) >= evidenceIndex("anecdotal")) {
      newDepth = "explored";
    } else if (rt === "partial") {
      newDepth = "touched";
    } else {
      // pivot, dodge, none → touched (if was unexplored)
      newDepth = depthIndex(state.depth) < depthIndex("touched") ? "touched" : state.depth;
    }

    // Depth can only advance (never regress from normal updates, only from contradictions)
    if (depthIndex(newDepth) > depthIndex(state.depth)) {
      state.depth = newDepth;
    }

    // Update best evidence (only advances)
    if (evidenceIndex(et) > evidenceIndex(state.bestEvidence)) {
      state.bestEvidence = et;
    }

    // Record first exploration turn
    if (!state.turnFirstExplored && depthIndex(state.depth) > 0) {
      state.turnFirstExplored = turnCount;
    }
  }

  // Step 3: If user addressed a different territory than targeted, mark target as touched
  if (
    addressed !== targetTerritory &&
    targetTerritory &&
    map[targetTerritory] &&
    map[targetTerritory].depth === "unexplored"
  ) {
    map[targetTerritory].depth = "touched";
    if (!map[targetTerritory].turnFirstExplored) {
      map[targetTerritory].turnFirstExplored = turnCount;
    }
  }

  return map;
}

/**
 * Computes intensity from turn count, coverage ratio, and engagement.
 * Monotonic: never decreases. No WRAPPING before turn 3.
 */
export function computeIntensity(
  turnCount: number,
  coverageRatio: number,
  consecutiveLowEngagement: number,
  previousIntensity: Intensity
): Intensity {
  // Turn-based
  let turnBased: Intensity;
  if (turnCount <= 1) turnBased = "CURIOUS";
  else if (turnCount <= 3) turnBased = "PROBING";
  else if (turnCount <= 6) turnBased = "POINTED";
  else turnBased = "WRAPPING";

  // Coverage-based
  let coverageBased: Intensity;
  if (coverageRatio < 0.3) coverageBased = "CURIOUS";
  else if (coverageRatio < 0.5) coverageBased = "PROBING";
  else if (coverageRatio < 0.7) coverageBased = "POINTED";
  else coverageBased = "WRAPPING";

  // Base = max(turn-based, coverage-based)
  let baseIndex = Math.max(
    INTENSITY_ORDER.indexOf(turnBased),
    INTENSITY_ORDER.indexOf(coverageBased)
  );

  // If 2+ consecutive low engagement: advance one level
  if (consecutiveLowEngagement >= 2) {
    baseIndex = Math.min(baseIndex + 1, INTENSITY_ORDER.length - 1);
  }

  // Monotonic: never below previous
  const prevIndex = INTENSITY_ORDER.indexOf(previousIntensity);
  baseIndex = Math.max(baseIndex, prevIndex);

  // Guardrail: no WRAPPING on turns 1-3
  if (turnCount <= 3 && baseIndex >= INTENSITY_ORDER.indexOf("WRAPPING")) {
    baseIndex = INTENSITY_ORDER.indexOf("POINTED");
  }

  return INTENSITY_ORDER[baseIndex];
}

/**
 * Assigns the next territory for Hank to explore.
 * Priority: contradictions > touched (dodged) > unexplored > explored not settled.
 * Returns null if all relevant territories are settled or exhausted.
 */
export function assignTerritory(
  coverageMap: CoverageMap,
  intent: Intent,
  contradictions: StoredContradiction[],
  territoryAssignmentCounts: Partial<Record<Territory, number>>,
  memoryNudges?: MemoryNudge[]
): Territory | null {
  // Priority 0: Territories with unresolved hard contradictions (most recent first)
  const unresolvedHard = contradictions
    .filter((c) => !c.resolved && c.severity === "hard")
    .sort((a, b) => b.turnDetected - a.turnDetected);

  for (const c of unresolvedHard) {
    if (coverageMap[c.territory]?.relevant) {
      return c.territory;
    }
  }

  // Helper: is territory exhausted (assigned 3+ times while still touched)
  function isExhausted(t: Territory): boolean {
    const count = territoryAssignmentCounts[t] ?? 0;
    return count >= 3 && coverageMap[t].depth === "touched";
  }

  // Priority 1: Touched territories (user dodged — oldest first), excluding exhausted
  const touched = ALL_TERRITORIES.filter(
    (t) =>
      coverageMap[t].relevant &&
      coverageMap[t].depth === "touched" &&
      !isExhausted(t)
  ).sort((a, b) => {
    const aFirst = coverageMap[a].turnFirstExplored ?? Infinity;
    const bFirst = coverageMap[b].turnFirstExplored ?? Infinity;
    return aFirst - bFirst;
  });

  if (touched.length > 0) return touched[0];

  // Priority 2: Unexplored territories (by territory order)
  const unexplored = ALL_TERRITORIES.filter(
    (t) => coverageMap[t].relevant && coverageMap[t].depth === "unexplored"
  );

  // `pattern` jumps to front if memoryNudges exist
  if (memoryNudges && memoryNudges.length > 0) {
    const patternIdx = unexplored.indexOf("pattern");
    if (patternIdx > 0) {
      unexplored.splice(patternIdx, 1);
      unexplored.unshift("pattern");
    }
  }

  if (unexplored.length > 0) return unexplored[0];

  // Priority 3: Explored but not settled
  const explored = ALL_TERRITORIES.filter(
    (t) => coverageMap[t].relevant && coverageMap[t].depth === "explored"
  );

  if (explored.length > 0) return explored[0];

  // All relevant territories settled or exhausted
  return null;
}

/**
 * Computes the coverage ratio: explored+ / relevant.
 */
export function computeCoverageRatio(coverageMap: CoverageMap): number {
  let relevantCount = 0;
  let coveredCount = 0;

  for (const territory of ALL_TERRITORIES) {
    const state = coverageMap[territory];
    if (!state.relevant) continue;
    relevantCount++;
    if (depthIndex(state.depth) >= depthIndex("explored")) {
      coveredCount++;
    }
  }

  return relevantCount > 0 ? coveredCount / relevantCount : 0;
}

/**
 * Computes the Hank Score from coverage map and turn summaries.
 * Breadth (40%) + Depth (35%) + Engagement (25%), 1-10 scale.
 */
export function computeHankScore(
  coverageMap: CoverageMap,
  turnSummaries: TurnSummary[]
): HankScoreResult {
  // Breadth: explored+ / relevant × 10
  let relevantCount = 0;
  let exploredCount = 0;
  let strongestTerritory: Territory | undefined;
  let weakestTerritory: Territory | undefined;
  let strongestEvidence = -1;
  let weakestEvidence = Infinity;

  for (const territory of ALL_TERRITORIES) {
    const state = coverageMap[territory];
    if (!state.relevant) continue;
    relevantCount++;
    if (depthIndex(state.depth) >= depthIndex("explored")) {
      exploredCount++;
    }

    const ev = EVIDENCE_VALUES[state.bestEvidence];
    if (ev > strongestEvidence) {
      strongestEvidence = ev;
      strongestTerritory = territory;
    }
    if (ev < weakestEvidence && state.depth !== "unexplored") {
      weakestEvidence = ev;
      weakestTerritory = territory;
    }
  }

  const breadthRaw = relevantCount > 0 ? (exploredCount / relevantCount) * 10 : 0;

  // Depth: mean evidence value across covered territories / 4 × 10
  let evidenceSum = 0;
  let coveredCount = 0;
  for (const territory of ALL_TERRITORIES) {
    const state = coverageMap[territory];
    if (!state.relevant) continue;
    if (depthIndex(state.depth) >= depthIndex("explored")) {
      evidenceSum += EVIDENCE_VALUES[state.bestEvidence];
      coveredCount++;
    }
  }
  const depthRaw = coveredCount > 0 ? (evidenceSum / coveredCount / 4) * 10 : 0;

  // Engagement: mean engagement value across scored turns / 4 × 10
  // Skip turn 1 (opener, no engagement to measure)
  const scoredTurns = turnSummaries.filter((t) => t.turn > 1);
  let engagementSum = 0;
  for (const turn of scoredTurns) {
    engagementSum += ENGAGEMENT_VALUES[turn.responseType] ?? 0;
  }
  const engagementRaw =
    scoredTurns.length > 0 ? (engagementSum / scoredTurns.length / 4) * 10 : 0;

  // Clamp each component to [0, 10] before blending
  const breadthClamped = clamp(breadthRaw, 0, 10);
  const depthClamped = clamp(depthRaw, 0, 10);
  const engagementClamped = clamp(engagementRaw, 0, 10);

  // Composite
  const raw = breadthClamped * 0.4 + depthClamped * 0.35 + engagementClamped * 0.25;
  const score = clamp(Math.ceil(raw), 1, 10);
  const label = HANK_SCORE_LABELS[String(score)] ?? "Unknown";
  const coverageRatio = relevantCount > 0 ? exploredCount / relevantCount : 0;

  return {
    score,
    label,
    coverageRatio,
    breadthScore: breadthClamped,
    depthScore: depthClamped,
    engagementScore: engagementClamped,
    strongestTerritory,
    weakestTerritory,
  };
}

// === Helpers for prompt building ===

/**
 * Build examination progress text from coverage map.
 */
export function buildExaminationProgress(coverageMap: CoverageMap): string {
  const lines: string[] = [];
  for (const territory of ALL_TERRITORIES) {
    const state = coverageMap[territory];
    if (!state.relevant) continue;
    const label = TERRITORY_LABELS[territory];
    lines.push(`  ${label}: ${state.depth}${state.bestEvidence !== "none" ? ` (evidence: ${state.bestEvidence})` : ""}`);
  }
  return `EXAMINATION PROGRESS:\n${lines.join("\n")}`;
}

/**
 * Build territory guidance text for the assigned territory.
 */
export function buildTerritoryGuidance(
  territory: Territory | null,
  coverageMap: CoverageMap,
  exhaustedTerritory?: Territory
): string {
  if (!territory) {
    return "TERRITORY: All relevant territories have been covered. Push toward a decision.";
  }

  const state = coverageMap[territory];
  const label = TERRITORY_LABELS[territory];
  const depthNote = state.depth === "touched"
    ? "They've dodged this before. Be direct."
    : state.depth === "explored"
      ? "Partially covered. Push for specifics."
      : "Unexplored. Open it up.";

  let guidance = `TERRITORY ASSIGNMENT: Ask about "${label}". ${depthNote}`;

  if (exhaustedTerritory) {
    const exhaustedLabel = TERRITORY_LABELS[exhaustedTerritory];
    guidance += `\nNOTE: They've avoided "${exhaustedLabel}" three times. Name the avoidance — "You keep dodging [topic]. That tells me something."`;
  }

  return guidance;
}
