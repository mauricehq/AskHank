// Pure computation — no Convex imports
// Banger system: scores whether a mic-drop moment should fire after Hank's response

import type {
  PersistedContext,
  Intensity,
  TurnSummary,
  Territory,
  StoredContradiction,
  CoverageMap,
  TerritoryDepth,
} from "./compass";
import { computeWorkHours } from "./workHours";

// === Types ===

export type BangerTone =
  | "mirror_crack"
  | "dead_shrug"
  | "slow_knife"
  | "time_check"
  | "wry_salute";

export interface PastConversationSummary {
  _id: string;
  item?: string;
  category?: string;
  estimatedPrice?: number;
  decision?: string;
  createdAt?: number;
}

export interface BangerInput {
  persistedContext: PersistedContext;
  turnCount: number;
  intensity: Intensity;
  pastConversations: PastConversationSummary[];
  userIncomeAmount?: number;
  userIncomeType?: "hourly" | "annual";
  userSavedTotal: number;
  isClosingTurn: boolean;
  financialDistress: boolean;
  userConceded: boolean;
}

export interface TriggerResult {
  triggered: boolean;
  tier: 1 | 2 | 3;
  key: string;
  detail: string;
  preferredTone: BangerTone;
}

export interface BangerResult {
  shouldFire: boolean;
  tone?: BangerTone;
  whatJustHappened?: string;
  triggerReason?: string;
  score: number;
  triggers: TriggerResult[];
}

// === Tone Directions (injected into Call 3 prompt) ===

export const TONE_DIRECTIONS: Record<BangerTone, string> = {
  mirror_crack:
    "Reflect their own logic back — the contradiction does the work, not your judgment. Setup: restate what they said. Punchline: the gap.",
  dead_shrug:
    "Withdraw energy. The flatness is the point. Setup: acknowledge what they said. Punchline: let the silence do the work.",
  slow_knife:
    "Name the real thing underneath the purchase — the itch they're actually scratching. Setup: reframe what they described. Punchline: what it's really about.",
  time_check:
    "Invoke the future. Setup: describe the purchase in present tense. Punchline: what it looks like in three weeks.",
  wry_salute:
    "Concede with respect — they made the case. Setup: acknowledge what they brought. Punchline: dry, grudging respect.",
};

// === Helpers ===

function depthAtLeast(depth: TerritoryDepth, minimum: TerritoryDepth): boolean {
  const order: TerritoryDepth[] = ["unexplored", "touched", "explored", "settled"];
  return order.indexOf(depth) >= order.indexOf(minimum);
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// === Trigger Detectors ===

function detectLiveContradiction(ctx: PersistedContext): TriggerResult {
  const unresolved = ctx.contradictions.filter(
    (c) => c.severity === "hard" && !c.resolved
  );
  return {
    triggered: unresolved.length >= 1,
    tier: 1,
    key: "live_contradiction",
    detail: unresolved.length > 0
      ? `User contradicted themselves on ${unresolved[0].territory}: "${unresolved[0].priorClaim}" vs "${unresolved[0].currentClaim}"`
      : "",
    preferredTone: "mirror_crack",
  };
}

function detectCategoryRelapse(
  ctx: PersistedContext,
  past: PastConversationSummary[]
): TriggerResult {
  if (past.length < 3) return { triggered: false, tier: 1, key: "category_relapse", detail: "", preferredTone: "slow_knife" };

  const sameCategory = past.filter((c) => c.category === ctx.category);
  if (sameCategory.length < 3) return { triggered: false, tier: 1, key: "category_relapse", detail: "", preferredTone: "slow_knife" };

  const buyCount = sameCategory.filter((c) => c.decision === "buying").length;
  const ratio = buyCount / sameCategory.length;
  return {
    triggered: ratio > 0.6,
    tier: 1,
    key: "category_relapse",
    detail: `${sameCategory.length} past ${ctx.category} conversations, ${Math.round(ratio * 100)}% bought`,
    preferredTone: "slow_knife",
  };
}

function detectEmotionalCrumble(ctx: PersistedContext): TriggerResult {
  const summaries = ctx.turnSummaries;
  if (summaries.length < 4) return { triggered: false, tier: 1, key: "emotional_crumble", detail: "", preferredTone: "slow_knife" };

  // Current turn (last) must be emotional
  const current = summaries[summaries.length - 1];
  if (!current.emotionalReasoning) return { triggered: false, tier: 1, key: "emotional_crumble", detail: "", preferredTone: "slow_knife" };

  // Previous 3+ turns must be non-emotional
  const preceding = summaries.slice(0, -1).slice(-3);
  if (preceding.length < 3) return { triggered: false, tier: 1, key: "emotional_crumble", detail: "", preferredTone: "slow_knife" };

  const allNonEmotional = preceding.every((s) => !s.emotionalReasoning);
  return {
    triggered: allNonEmotional,
    tier: 1,
    key: "emotional_crumble",
    detail: "User switched to emotional reasoning after 3+ rational turns",
    preferredTone: "slow_knife",
  };
}

function detectPriceShock(
  ctx: PersistedContext,
  past: PastConversationSummary[]
): TriggerResult {
  if (past.length < 3) return { triggered: false, tier: 1, key: "price_shock", detail: "", preferredTone: "time_check" };

  const prices = past
    .map((c) => c.estimatedPrice)
    .filter((p): p is number => typeof p === "number" && p > 0);
  if (prices.length < 3) return { triggered: false, tier: 1, key: "price_shock", detail: "", preferredTone: "time_check" };

  const medianPrice = median(prices);
  const currentPrice = ctx.estimated_price;
  return {
    triggered: currentPrice >= medianPrice * 3,
    tier: 1,
    key: "price_shock",
    detail: `$${currentPrice} is ${Math.round(currentPrice / medianPrice)}x the median past price of $${Math.round(medianPrice)}`,
    preferredTone: "time_check",
  };
}

function detectFullCoverage(ctx: PersistedContext): TriggerResult {
  const map = ctx.coverageMap;
  const relevant = Object.values(map).filter((s) => s.relevant);
  if (relevant.length < 4) return { triggered: false, tier: 2, key: "full_coverage", detail: "", preferredTone: "wry_salute" };

  const allExplored = relevant.every((s) => depthAtLeast(s.depth, "explored"));
  return {
    triggered: allExplored,
    tier: 2,
    key: "full_coverage",
    detail: `All ${relevant.length} relevant territories explored or settled`,
    preferredTone: "wry_salute",
  };
}

function detectArgumentWall(ctx: PersistedContext): TriggerResult {
  const summaries = ctx.turnSummaries;
  if (summaries.length < 3) return { triggered: false, tier: 2, key: "argument_wall", detail: "", preferredTone: "dead_shrug" };

  const lastThree = summaries.slice(-3);
  const allSame = lastThree.every((s) => s.argumentType === "same_as_before");
  return {
    triggered: allSame,
    tier: 2,
    key: "argument_wall",
    detail: "User repeated the same argument 3 turns in a row",
    preferredTone: "dead_shrug",
  };
}

function detectSkipStreak(past: PastConversationSummary[]): TriggerResult {
  if (past.length < 3) return { triggered: false, tier: 2, key: "skip_streak", detail: "", preferredTone: "wry_salute" };

  // Sort by createdAt descending
  const sorted = [...past]
    .filter((c) => c.decision)
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

  let streak = 0;
  for (const c of sorted) {
    if (c.decision === "skipping") streak++;
    else break;
  }

  return {
    triggered: streak >= 3,
    tier: 2,
    key: "skip_streak",
    detail: `${streak} consecutive skipping decisions`,
    preferredTone: "wry_salute",
  };
}

function detectEvidenceUpgrade(ctx: PersistedContext): TriggerResult {
  const summaries = ctx.turnSummaries;
  const map = ctx.coverageMap;

  // Look for a territory that started with none/assertion evidence and now has specific/concrete
  const lowTiers = new Set(["none", "assertion"]);
  const highTiers = new Set(["specific", "concrete"]);

  for (const territory of Object.keys(map) as Territory[]) {
    const state = map[territory];
    if (!state.relevant || !highTiers.has(state.bestEvidence)) continue;

    // Check if the first turn addressing this territory had low evidence
    const firstTurn = summaries.find(
      (s) => s.territoryAddressed === territory
    );
    if (firstTurn && lowTiers.has(firstTurn.evidenceTier)) {
      return {
        triggered: true,
        tier: 2,
        key: "evidence_upgrade",
        detail: `Evidence on ${territory} jumped from ${firstTurn.evidenceTier} to ${state.bestEvidence}`,
        preferredTone: "wry_salute",
      };
    }
  }

  return { triggered: false, tier: 2, key: "evidence_upgrade", detail: "", preferredTone: "wry_salute" };
}

function detectCategoryDebut(
  ctx: PersistedContext,
  past: PastConversationSummary[]
): TriggerResult {
  if (past.length < 1) return { triggered: false, tier: 2, key: "category_debut", detail: "", preferredTone: "slow_knife" };

  const sameCategory = past.filter((c) => c.category === ctx.category);
  return {
    triggered: sameCategory.length === 0,
    tier: 2,
    key: "category_debut",
    detail: `First ${ctx.category} conversation — new territory`,
    preferredTone: "slow_knife",
  };
}

function detectDodgePattern(ctx: PersistedContext): TriggerResult {
  const counts = ctx.territoryAssignmentCounts;
  const map = ctx.coverageMap;

  for (const territory of Object.keys(counts) as Territory[]) {
    const count = counts[territory] ?? 0;
    if (count >= 2 && map[territory] && map[territory].depth === "touched") {
      return {
        triggered: true,
        tier: 2,
        key: "dodge_pattern",
        detail: `User dodged ${territory} ${count} times — still only "touched"`,
        preferredTone: "mirror_crack",
      };
    }
  }

  return { triggered: false, tier: 2, key: "dodge_pattern", detail: "", preferredTone: "mirror_crack" };
}

function detectWorkHoursBomb(
  ctx: PersistedContext,
  incomeAmount?: number,
  incomeType?: "hourly" | "annual"
): TriggerResult {
  const result = computeWorkHours(ctx.estimated_price, incomeAmount, incomeType);
  if (!result) return { triggered: false, tier: 2, key: "work_hours_bomb", detail: "", preferredTone: "time_check" };

  return {
    triggered: result.hoursEquivalent >= 20,
    tier: 2,
    key: "work_hours_bomb",
    detail: `Item costs ${result.hoursEquivalent} hours of work`,
    preferredTone: "time_check",
  };
}

function detectFirstChat(past: PastConversationSummary[]): TriggerResult {
  return {
    triggered: past.length === 0,
    tier: 3,
    key: "first_chat",
    detail: "User's very first conversation",
    preferredTone: "slow_knife",
  };
}

function detectSavingsMilestone(
  ctx: PersistedContext,
  savedTotal: number
): TriggerResult {
  if (savedTotal <= 0) return { triggered: false, tier: 3, key: "savings_milestone", detail: "", preferredTone: "wry_salute" };

  const currentPrice = ctx.estimated_price;
  const projectedTotal = savedTotal + currentPrice;

  const milestones = [100, 250, 500, 1000, 2500, 5000, 10000];
  const crossed = milestones.find((m) => savedTotal < m && projectedTotal >= m);

  return {
    triggered: !!crossed,
    tier: 3,
    key: "savings_milestone",
    detail: crossed ? `Skipping would push savings past $${crossed.toLocaleString()}` : "",
    preferredTone: "wry_salute",
  };
}

function detectSpeedrun(ctx: PersistedContext, intensity: Intensity): TriggerResult {
  return {
    triggered: intensity === "WRAPPING" && ctx.turnSummaries.length <= 3,
    tier: 3,
    key: "speedrun",
    detail: "Reached WRAPPING intensity in 3 turns or fewer",
    preferredTone: "wry_salute",
  };
}

function detectFlipFlop(
  ctx: PersistedContext,
  past: PastConversationSummary[]
): TriggerResult {
  if (past.length < 1) return { triggered: false, tier: 3, key: "flip_flop", detail: "", preferredTone: "mirror_crack" };

  const sameCategory = past
    .filter((c) => c.category === ctx.category && c.decision)
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

  if (sameCategory.length === 0) return { triggered: false, tier: 3, key: "flip_flop", detail: "", preferredTone: "mirror_crack" };

  const lastDecision = sameCategory[0].decision;
  // Spec says "opposite decision" but current decision isn't known yet (conversation ongoing).
  // Practical interpretation: they said they'd skip, and now they're back considering the same
  // category. The reverse (bought last time, back again) is covered by category_relapse.
  return {
    triggered: lastDecision === "skipping",
    tier: 3,
    key: "flip_flop",
    detail: `Last ${ctx.category} decision was skipping — user is back`,
    preferredTone: "mirror_crack",
  };
}

// === Main Scorer ===

export function evaluateBanger(input: BangerInput): BangerResult {
  const {
    persistedContext: ctx,
    turnCount,
    intensity,
    pastConversations,
    userIncomeAmount,
    userIncomeType,
    userSavedTotal,
    isClosingTurn,
    financialDistress,
    userConceded,
  } = input;

  const bangerCount = ctx.bangerCount ?? 0;
  const lastBangerTurn = ctx.lastBangerTurn ?? 0;

  // Gate checks — hard blocks
  if (intensity === "CURIOUS") {
    return { shouldFire: false, score: 0, triggers: [] };
  }
  if (turnCount < 3) {
    return { shouldFire: false, score: 0, triggers: [] };
  }
  if (bangerCount > 3) {
    return { shouldFire: false, score: 0, triggers: [] };
  }
  if (turnCount - lastBangerTurn < 2 && lastBangerTurn > 0) {
    return { shouldFire: false, score: 0, triggers: [] };
  }
  if (isClosingTurn) {
    return { shouldFire: false, score: 0, triggers: [] };
  }

  // Suppression: disengaged user
  if (ctx.consecutiveNonAnswers >= 2 || ctx.consecutiveLowEngagement >= 2) {
    return { shouldFire: false, score: 0, triggers: [] };
  }

  // Suppression: medical/safety purchases — don't mic-drop on car seats
  if (ctx.category === "safety_health") {
    return { shouldFire: false, score: 0, triggers: [] };
  }

  // Suppression: financial distress — user mentions debt, job loss, can't afford it
  if (financialDistress) {
    return { shouldFire: false, score: 0, triggers: [] };
  }

  // Suppression: user already conceded — piling on is cruel
  if (userConceded) {
    return { shouldFire: false, score: 0, triggers: [] };
  }

  // Run all 15 triggers
  const triggers: TriggerResult[] = [
    // Tier 1
    detectLiveContradiction(ctx),
    detectCategoryRelapse(ctx, pastConversations),
    detectEmotionalCrumble(ctx),
    detectPriceShock(ctx, pastConversations),
    // Tier 2
    detectFullCoverage(ctx),
    detectArgumentWall(ctx),
    detectSkipStreak(pastConversations),
    detectEvidenceUpgrade(ctx),
    detectCategoryDebut(ctx, pastConversations),
    detectDodgePattern(ctx),
    detectWorkHoursBomb(ctx, userIncomeAmount, userIncomeType),
    // Tier 3
    detectFirstChat(pastConversations),
    detectSavingsMilestone(ctx, userSavedTotal),
    detectSpeedrun(ctx, intensity),
    detectFlipFlop(ctx, pastConversations),
  ];

  const fired = triggers.filter((t) => t.triggered);
  const score = fired.reduce((sum, t) => sum + (t.tier === 1 ? 2 : 1), 0);

  // Threshold: >= 2 points to fire
  if (score < 2) {
    return { shouldFire: false, score, triggers: fired };
  }

  // PROBING intensity: only Tier 1 triggers can fire solo
  if (intensity === "PROBING") {
    const hasTier1 = fired.some((t) => t.tier === 1);
    if (!hasTier1) {
      return { shouldFire: false, score, triggers: fired };
    }
  }

  // Pick tone from highest-tier (lowest number) trigger
  const sortedByTier = [...fired].sort((a, b) => a.tier - b.tier);
  const winningTrigger = sortedByTier[0];

  return {
    shouldFire: true,
    tone: winningTrigger.preferredTone,
    whatJustHappened: winningTrigger.detail,
    triggerReason: winningTrigger.key,
    score,
    triggers: fired,
  };
}

// === Quality Gate ===

const META_LANGUAGE = /\b(mic drop|boom|plot twist|pattern detected|there it is|nail.*coffin|case closed|checkmate)\b/i;
const FIRST_PERSON_RE = /\b(I think|I'd say|I would|I believe|I notice|I see)\b/i;
const EMOJI_RE = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

export function passesBangerQualityGate(text: string): boolean {
  const trimmed = text.trim();

  // Too short or too long
  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount < 5 || wordCount > 40) return false;

  // Emojis
  if (EMOJI_RE.test(trimmed)) return false;

  // Meta-language
  if (META_LANGUAGE.test(trimmed)) return false;

  // First-person
  if (FIRST_PERSON_RE.test(trimmed)) return false;

  return true;
}
