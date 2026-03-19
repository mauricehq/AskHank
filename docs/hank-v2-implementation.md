# AskHank v2 — Implementation Guide

The complete file-by-file implementation guide for building v2. Maps every v1 concept to what replaces it, organized by phase.

**Source specs:** `hank-v2.md` (master spec), `hank-voice-v2.md` (voice spec)

---

## Overview

### What Changes

v1 is a debate. Hank argues, scores, and delivers a verdict (DENIED/APPROVED).
v2 is an examination. Hank asks questions, tracks coverage, and the user decides (buying/skipping/thinking). Hank reacts with a score.

### What Stays

- **Three-call LLM pattern** — Call 1 (assess), Call 2 (respond), Call 3 (reaction summary). The pattern is preserved; the content of each call changes.
- **Personality** — dry, observant, deadpan. Same character, different mechanism.
- **Credit system** — unchanged.
- **Context window management** — turns 9+ sliding window, `lastAssessment` JSON carry-forward.
- **Memory base** — `selectMemoryNudge`, `formatNudgePrompt`, `memoryReferenceCount` rotation. Enhanced but not replaced.
- **Rhetorical moves** — `moves.ts` detection + prompt injection unchanged.
- **Work-hours conversion** — `workHours.ts` unchanged.

### The Core Shift

| v1 Concept | v2 Replacement |
|---|---|
| Running score (0→43+) | Coverage map (7 territories × 4 depth levels) |
| Stance (IMMOVABLE→CONCEDE) | Intensity (CURIOUS→WRAPPING) |
| Auto-verdict (score triggers DENIED/APPROVED) | User decides (Decision Bar: buying/skipping/thinking) |
| `computeTurnDelta` / `getStartingScore` | `updateCoverage` / `initCoverageMap` |
| `determineStance` | `computeIntensity` |
| Patience meter / collapse / disengagement-denied | Coverage stagnation + territory exhaustion + non-answer handling |
| `shareScore` (5-99) | Hank Score (1-10) |
| `verdictSummary` (25-word Call 3) | `reactionText` (Hank's reaction to user's decision) |

---

## Phase 1: Engine Core ✅

Three files are full rewrites. This is the heart of v2. **COMPLETE** — implemented + review fixes applied (3 bugs, 3 medium, 6 low).

### 1.1 `convex/llm/scoring.ts` → `convex/llm/compass.ts`

Rename the file. Every type and function changes.

#### Types to Remove

| v1 Type | Location | Replacement |
|---|---|---|
| `Stance` | Line 1 | `Intensity` |
| `TurnAssessment` | Lines 5-22 | New `TurnAssessment` (v2 fields) |
| `TurnSummary` | Lines 24-30 | New `TurnSummary` (territory-based) |
| `ScoringResult` | Lines 32-38 | `CompassResult` |

#### Types to Add

```typescript
// === Enums ===

export type Intensity = 'CURIOUS' | 'PROBING' | 'POINTED' | 'WRAPPING';
export type Intent = 'want' | 'need' | 'replace' | 'upgrade' | 'gift'; // unchanged

export type Territory =
  | 'trigger'
  | 'current_solution'
  | 'usage_reality'
  | 'real_cost'
  | 'pattern'
  | 'alternatives'
  | 'emotional_check';

export type TerritoryDepth = 'unexplored' | 'touched' | 'explored' | 'settled';
export type Decision = 'buying' | 'skipping' | 'thinking';

// From v4 (proven in blind tests — carry forward unchanged)
export type ResponseType = 'direct_counter' | 'partial' | 'pivot' | 'dodge' | 'none';
export type EvidenceTier = 'none' | 'assertion' | 'anecdotal' | 'specific' | 'concrete';
export type ArgumentType = 'same_as_before' | 'new_usage' | 'new_deficiency'
  | 'new_financial' | 'new_comparison' | 'new_other';

export type ContradictionSeverity = 'refinement' | 'soft' | 'hard';

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
  severity: 'soft' | 'hard';   // refinements not stored
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
  territory_addressed: Territory | 'other';
  // Engagement quality (v4 enums)
  response_type: ResponseType;
  evidence_tier: EvidenceTier;
  argument_type: ArgumentType;
  emotional_reasoning: boolean;
  // Contradiction
  contradiction: DetectedContradiction | null;
  // Flags
  is_non_answer: boolean;
  is_out_of_scope: boolean;
  user_resolved: 'buying' | 'skipping' | null;
  is_directed_question: boolean;
  // Trace
  challenge_topic: string;
}

// === Turn Summary (per-turn record in PersistedContext) ===

export interface TurnSummary {
  turn: number;
  territoryTargeted: Territory | null;
  territoryAddressed: Territory | 'other';
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
  turnsSinceCoverageAdvanced: number;  // coverage stagnation counter
  territoryAssignmentCounts: Partial<Record<Territory, number>>;  // how many times each territory has been assigned
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
  territoryExhausted?: Territory;       // territory just hit 3× dodge limit (Hank should name the avoidance)
  coverageRatio: number;
  turnCount: number;
  turnsSinceCoverageAdvanced: number;   // for stagnation-aware prompt guidance
  decisionType: string;
  // For prompt builder
  intensityGuidance: string;
  territoryGuidance: string;
  examinationProgress: string;
}

// === Hank Score (calculated at resolution) ===

export interface HankScoreResult {
  score: number;          // 1-10
  label: string;          // "Pure impulse", "Gut feeling", etc.
  coverageRatio: number;
  breadthScore: number;
  depthScore: number;
  engagementScore: number;
  strongestTerritory?: Territory;
  weakestTerritory?: Territory;
}
```

#### Functions to Remove

| v1 Function | What it did |
|---|---|
| `getStartingScore(intent)` | Mapped intent to starting score bonus (0-8) |
| `computeTurnDelta(assessment)` | Computed per-turn score change (-5 to +16) |
| `determineStance(score, thresholdMultiplier)` | Mapped running score to stance via thresholds |
| `applyStanceGuardrails(computed, previous, turn)` | Floor + pace-cap on stance transitions |
| `computePriceModifier(price)` | Log formula for threshold scaling by price |
| `computeShareScore(score, multiplier, summaries)` | 5-99 debate strength for share card |

#### Functions to Add

**`initCoverageMap(intent: Intent): CoverageMap`**
- Creates the 7-territory map with `relevant` set by intent
- Uses the Territory Relevance by Intent table from the spec
- `replace` intent: `current_solution` starts at `touched` (partial)
- All others start at `unexplored`

**`updateCoverage(coverageMap, assessment, targetTerritory, turnCount): CoverageMap`**
- Step 1: Handle contradiction (degrade on hard)
- Step 2: Update addressed territory depth + bestEvidence
- Step 3: If user pivoted, mark target as `touched`
- Depth computation from response quality:
  - `direct_counter` + evidence >= `specific` → `settled`
  - `direct_counter` + evidence >= `anecdotal` → `explored`
  - `partial` + evidence >= `anecdotal` → `explored`
  - `partial` + evidence < `anecdotal` → `touched`
  - `pivot`/`dodge`/`none` → `touched` (if was unexplored)

**`computeIntensity(turnCount, coverageRatio, consecutiveLowEngagement, previousIntensity): Intensity`**
- Turn-based: 1→CURIOUS, 2-3→PROBING, 4-6→POINTED, 7+→WRAPPING
- Coverage-based: <0.30→CURIOUS, 0.30-0.49→PROBING, 0.50-0.69→POINTED, 0.70+→WRAPPING
- Base = max(turn-based, coverage-based)
- If consecutiveLowEngagement >= 2: advance one level
- Monotonic: return max(base, previousIntensity)
- Guardrail: no WRAPPING before turn 3

**`assignTerritory(coverageMap, intent, contradictions, territoryAssignmentCounts, memoryNudges?): Territory | null`**
- Priority 0: Territories with unresolved hard contradictions (most recent first)
- Priority 1: Touched territories (user dodged — oldest first), excluding exhausted territories (assigned 3× while still `touched`)
- Priority 2: Unexplored territories (by territory order; `pattern` jumps to front if memoryNudges exist)
- Priority 3: Explored but not settled
- null if all relevant territories are settled or exhausted
- When a territory is exhausted (assigned 3× at `touched`): it stays `touched` permanently, dragging down Hank Score. Hank names the avoidance in his response.

**`computeCoverageRatio(coverageMap): number`**
- `territoriesExploredOrSettled / relevantTerritories`

**`computeHankScore(coverageMap, turnSummaries): HankScoreResult`**
- Coverage Breadth (40%): explored+ territories / relevant territories × 10
- Coverage Depth (35%): mean evidence value across covered territories / 4 × 10
  - Evidence values: none/assertion=0, anecdotal=1, specific=2.5, concrete=4
- Engagement Quality (25%): mean engagement value across scored turns / 4 × 10
  - Engagement values: direct_counter=4, partial=2, pivot=0, dodge=-1, none=-2
- Raw = breadth×0.40 + depth×0.35 + engagement×0.25
- Final = clamp(ceil(raw), 1, 10)
- Labels: 1-2="Pure impulse", 3-4="Gut feeling", 5-6="Half-examined", 7-8="Well-considered", 9-10="Thoroughly examined"

#### Constants to Remove

| v1 Constant | Replacement |
|---|---|
| `STANCE_ORDER` | `INTENSITY_ORDER = ['CURIOUS', 'PROBING', 'POINTED', 'WRAPPING']` |

#### Constants to Add

```typescript
export const INTENSITY_ORDER: Intensity[] = ['CURIOUS', 'PROBING', 'POINTED', 'WRAPPING'];

export const ALL_TERRITORIES: Territory[] = [
  'trigger', 'current_solution', 'usage_reality',
  'real_cost', 'pattern', 'alternatives', 'emotional_check'
];

// Territory relevance by intent
// 'required' | 'relevant' | 'partial' | 'skip'
export const TERRITORY_RELEVANCE: Record<Intent, Record<Territory, string>> = {
  want:    { trigger: 'required', current_solution: 'required', usage_reality: 'required', real_cost: 'required', pattern: 'required', alternatives: 'relevant', emotional_check: 'required' },
  need:    { trigger: 'relevant', current_solution: 'required', usage_reality: 'relevant', real_cost: 'relevant', pattern: 'skip', alternatives: 'relevant', emotional_check: 'skip' },
  replace: { trigger: 'skip', current_solution: 'partial', usage_reality: 'relevant', real_cost: 'required', pattern: 'skip', alternatives: 'relevant', emotional_check: 'skip' },
  upgrade: { trigger: 'relevant', current_solution: 'required', usage_reality: 'relevant', real_cost: 'required', pattern: 'relevant', alternatives: 'required', emotional_check: 'relevant' },
  gift:    { trigger: 'skip', current_solution: 'skip', usage_reality: 'relevant', real_cost: 'relevant', pattern: 'skip', alternatives: 'relevant', emotional_check: 'relevant' },
};

export const HANK_SCORE_LABELS: Record<string, string> = {
  '1': 'Pure impulse', '2': 'Pure impulse',
  '3': 'Gut feeling', '4': 'Gut feeling',
  '5': 'Half-examined', '6': 'Half-examined',
  '7': 'Well-considered', '8': 'Well-considered',
  '9': 'Thoroughly examined', '10': 'Thoroughly examined',
};
```

---

### 1.2 `convex/llm/generate.ts` — Major Rewrite

The three-call LLM architecture stays. The decision logic inside each call changes completely.

#### Core Function Rename

`executeGetStance()` → `executeCompass()`

#### `executeGetStance` Decision Tree — What's Removed

All seven v1 branches are removed:

| v1 Branch | v1 Lines | v2 Replacement |
|---|---|---|
| out-of-scope | 218 | Kept — returns neutral compass result, no territory update |
| previous stance was CONCEDE | 235 | **Removed entirely** — no auto-concession |
| user_backed_down | 257 | **Removed** — replaced by `user_resolved: 'skipping'` |
| is_non_answer + disengagement >= 1 | 279 | **Removed** — no auto-denial. Hank disengages verbally, user still decides |
| is_non_answer (first) | 301 | Modified — increment `consecutiveNonAnswers`, no score change, no auto-close |
| is_directed_question | 320 | Simplified — no patience drain, no patience-denied |
| Normal turn | 370-484 | **Rewritten** — coverage update + intensity calculation |

#### `executeCompass` Decision Tree — What Replaces It

```
1. out-of-scope → no coverage update, intensity unchanged, decisionType="out-of-scope"
2. is_directed_question → no coverage update, intensity unchanged, decisionType="directed-question"
3. is_non_answer → increment consecutiveNonAnswers, increment consecutiveLowEngagement
   - count 1: decisionType="non-answer-warning"
   - count 2+: decisionType="non-answer-disengaged"
   - NO auto-closure. Hank warns/disengages verbally. User decides via Decision Bar.
4. user_resolved: 'buying' → auto-resolve. decisionType="auto-resolve-buying"
   - Compute Hank Score from current coverage map
   - Mark turn as closing. Response generation gets reaction guidance instead of territory assignment
5. user_resolved: 'skipping' → auto-resolve. decisionType="auto-resolve-skipping"
   - Same as buying but with skipping reaction guidance
6. Normal turn → update coverage map, compute intensity, assign territory
   - After updateCoverage: check if coverage actually advanced this turn
     - If yes: reset turnsSinceCoverageAdvanced to 0
     - If no: increment turnsSinceCoverageAdvanced
   - Increment territoryAssignmentCounts for assigned territory
   - If a territory hits 3× assignments while still `touched`: mark as exhausted, set territoryExhausted in CompassResult so prompt builder tells Hank to name the avoidance
   - Coverage stagnation behavior:
     - 0-2 stagnant turns: decisionType="normal"
     - 3 stagnant turns: decisionType="stagnation-warning" (Hank names the stagnation)
     - 4+ stagnant turns: decisionType="stagnation-disengaged" (single-sentence responses, no new territory)
```

#### v1 Mechanics to Remove from generate.ts

| Mechanic | v1 Location | What to do |
|---|---|---|
| Patience meter | Line 624 (`const patience = conversation.stagnationCount`) | Remove. No patience in v2. |
| Collapse check | Line 390 (`newRunningScore < -5 AND turnCount > 3`) | Remove entirely. |
| Patience exhausted | Line 413 (`patience >= 10`) | Remove entirely. |
| Score accumulation | Lines 370-380 | Remove. No running score. |
| `getStartingScore` call | Turn 1 branch | Remove. Turn 1 initializes coverage map instead. |
| `computeTurnDelta` call | Turn 2+ branch | Replace with `updateCoverage`. |
| `determineStance` + `applyStanceGuardrails` | Lines 440-460 | Replace with `computeIntensity`. |
| Auto-closing on CONCEDE | Line 235 | Remove. No auto-close. |
| `computeShareScore` call | Verdict path | Replace with `computeHankScore` (only at resolution). |

#### PersistedContext Changes

| v1 Field | Change |
|---|---|
| `item` | Unchanged |
| `estimated_price` | Unchanged |
| `category` | Unchanged |
| `intent` | Unchanged |
| `turnSummaries` | Restructured — now territory-based, not delta-based |
| `memoryNudgeText` | Unchanged |
| `coverageMap` | **New** — the core state object |
| `contradictions` | **New** — `StoredContradiction[]` |
| `consecutiveNonAnswers` | **New** — replaces disengagementCount (same concept, new name) |
| `consecutiveLowEngagement` | **New** — pivot/dodge/none counter for intensity acceleration |
| `turnsSinceCoverageAdvanced` | **New** — coverage stagnation counter. Increment when no depth/evidence change. Reset on advancement. |
| `territoryAssignmentCounts` | **New** — `Partial<Record<Territory, number>>`. Tracks how many times each territory has been assigned. Territory exhausted at 3× while still `touched`. |
| `lastAssignedTerritory` | **New** — what Hank was told to ask about |
| `memoryNudges` | **New** — up to 3 same-category past conversations |

#### ConversationState Changes

v1 `ConversationState` → v2 equivalent:

| v1 Field | v2 Replacement |
|---|---|
| `currentStance` | `currentIntensity` |
| `disengagementCount` | Read from `persistedContext.consecutiveNonAnswers` |
| `patience` | **Removed** |
| `runningScore` | **Removed** |
| `storedItem` | Read from `persistedContext.item` |
| `turnCount` | Unchanged |
| `previousContext` | Unchanged |

#### New: `resolve` Action

A new exported action for when the user taps the Decision Bar:

```
resolve(conversationId, decision: Decision):
  1. Load conversation + messages + persisted context
  2. Compute Hank Score from coverage map
  3. LLM call: generate reaction (closing_reaction tool)
     - Full personality prompt + reaction matrix guidance
     - Hank Score + decision context injected
  4. Save: reaction message + status=resolved + decision + hankScore + decisionLedger entry
  5. If decision='skipping': increment user.savedTotal + user.skippedCount
```

#### Call 2 Prompt Selection Changes

| v1 Condition | v1 Prompt | v2 Replacement |
|---|---|---|
| Closing turn (CONCEDE/denied) | `buildCloserPrompt()` | `buildReactionPrompt()` — only for auto-resolution turns |
| Turn 1 | `buildOpenerPrompt()` | `buildOpenerPrompt()` — updated content, same concept |
| Other turns | `buildSystemPrompt()` + scoring block | `buildSystemPrompt()` + compass block |

#### Scoring Block → Compass Block

v1 `buildScoringBlock()` injected a YAML block with stance + score + guidance.
v2 `buildCompassBlock()` injects:
- Current intensity level + guidance text
- Territory assignment (territory name + depth + direction)
- Examination progress summary (which territories covered, which dodged)
- Non-answer/low-engagement warnings if applicable

#### Call 3 Changes

v1 Call 3 (`buildVerdictSummaryPrompt`): generates 25-word verdict summary for share card.
v2 Call 3: only needed for Decision Bar resolution (not auto-resolve). When auto-resolve triggers, the response IS the reaction — no separate Call 3.

For Decision Bar resolution, the reaction is generated as part of the `resolve` action, not as Call 3 of the normal `respond` flow.

---

### 1.3 `convex/llm/prompt.ts` — Major Rewrite

Every prompt builder changes. The tool definition changes. The injected blocks change.

#### Tool Definition Changes

**`buildToolDefinition()` → `buildAssessmentToolDefinition()`**

Tool name: `get_stance` → `assess_turn`

v1 tool fields (13 required):
```
item, estimated_price, category, intent,
challenge_addressed, evidence_provided, new_angle, emotional_reasoning,
challenge_topic, is_non_answer, is_out_of_scope, user_backed_down,
is_directed_question
```

v2 tool fields:
```
// CoT (must come first)
hanks_question

// Context (turn 1)
item, estimated_price, category, intent

// Coverage
territory_addressed

// Engagement quality (v4 enums)
response_type, evidence_tier, argument_type, emotional_reasoning

// Contradiction
contradiction (object or null with territory, prior_claim, current_claim, reasoning, severity)

// Flags
is_non_answer, is_out_of_scope, user_resolved, is_directed_question

// Trace
challenge_topic
```

Fields removed: `challenge_addressed`, `evidence_provided`, `new_angle`, `user_backed_down`
Fields added: `hanks_question`, `territory_addressed`, `response_type`, `evidence_tier`, `argument_type`, `contradiction`, `user_resolved`

**`buildClosingToolDefinition()` → `buildReactionToolDefinition()`**

Tool name: `closing_response` → `closing_reaction`
Fields: `closing_line: string` → `reaction_text: string`

#### Prompt Content Changes

**`STANCE_INSTRUCTIONS` record → `INTENSITY_GUIDANCE` record**

v1 had 5 entries (IMMOVABLE through CONCEDE), each telling the LLM how hard to fight.

v2 has 4 entries (CURIOUS through WRAPPING), each telling the LLM what kind of questions to ask:

| Intensity | Guidance |
|---|---|
| CURIOUS | "This is new. You're getting oriented. Ask one clear, specific question about [assigned territory]. Don't push yet — observe." |
| PROBING | "You have the basics. Push on [assigned territory]. Reference what they've told you so far. If they gave you something real, acknowledge it briefly and go deeper." |
| POINTED | "You've found gaps. Be direct about [assigned territory]. If they've been avoiding this, name what they're avoiding." |
| WRAPPING | "Enough ground is covered. Summarize what you've heard — the strongest point and the biggest gap. Push them toward a decision. 'So what's the call.'" |

**`buildAssessmentPrompt()` changes:**

v1 included: stance context, price/category, DEBATE PROGRESS summary, out-of-scope rules, disengagement count, patience warnings.

v2 includes:
- Previous context (item, price, intent) — same
- EXAMINATION PROGRESS (coverage map as text) — replaces DEBATE PROGRESS
- What Hank was assigned to ask about (territory assignment) — new
- Contradiction detection instructions — new
- `user_resolved` detection instructions — new (replaces `user_backed_down`)
- Out-of-scope rules — same
- Disengagement count — same, renamed

Remove: stance context, patience warnings, all debate-specific language.

**`buildSystemPrompt()` changes:**

This is the main Call 2 prompt. Sweeping content changes:

| Section | v1 Content | v2 Content |
|---|---|---|
| Identity | "You talk people out of buying things" | "You ask the questions people avoid when they want to buy something" |
| Rules | 7 rules (stance instruction, don't concede, etc.) | 8 rules from hank-voice-v2.md (acknowledge appeal, investigate wanting, never fold, pattern over escalation, be wry not mean, name behavior not character, escalate care not aggression, never say "your choice") |
| Stance instruction | `STANCE_INSTRUCTIONS[stance]` | `INTENSITY_GUIDANCE[intensity]` + territory assignment block |
| Scoring block | `SCORING:` YAML (stance, score, delta, guidance) | `COMPASS:` block (intensity, territory assignment, examination progress) |
| Voice examples | v1 declarations | v2 acknowledgment + questions from hank-voice-v2.md |
| Anti-examples | Therapy-speak, generic sympathy | Expanded: + "told you so", category dismissiveness, "you're emotional", punitive withdrawal, competitive scoring language, identity-level judgments, prosecutorial questions |
| CONVERSATION PROGRESS | Turn-based advice (static) | Replaced by intensity guidance (dynamic, coverage-driven) |
| DEBATE PROGRESS | TurnSummary list | EXAMINATION PROGRESS (territory coverage map, which dodged, which settled) |
| Recent moves | Unchanged | Unchanged |
| Disengagement context | Same concept | Same concept, updated counts/thresholds |
| Patience context | "Hank is losing patience" warnings | **Removed entirely** |

**`buildOpenerPrompt()` changes:**

Same concept (turn 1 specialized prompt). Content updates:
- v1: "Challenge the purchase. Be direct."
- v2: "Acknowledge the appeal. Ask one clear, specific question." Territory assignment included (always the highest-priority unexplored territory).
- New examples from hank-voice-v2.md opener section

**`buildCloserPrompt()` → `buildReactionPrompt()`**

Completely rewritten. v1 generated a closing line for DENIED/APPROVED. v2 generates Hank's reaction to the user's decision.

Inputs: decision (buying/skipping/thinking), hankScore, coverage summary, item/price.

Prompt includes the reaction matrix from hank-voice-v2.md:
- Buying + low score (1-4): resigned, names the gap
- Buying + mid score (5-6): grudging respect, notes what's missing
- Buying + high score (7-10): genuine respect, get out of the way
- Skipping + low score (1-4): brief, user already knows
- Skipping + mid score (5-6): acknowledges it was close
- Skipping + high score (7-10): surprised, almost annoyed in a good way
- Thinking: brief, one line

The reaction must include a **closer** — a short sentence with verdict energy. Not a stamp. A mirror.

**`buildVerdictSummaryPrompt()` → remove or repurpose**

v1 Call 3 generated a 25-word share card summary. v2 doesn't need a separate summary — the reaction text IS the shareable moment. This function can be removed. If a short summary is still wanted for the decision card, it can be extracted from the reaction text or generated inline.

---

## Phase 2: Schema

### 2.1 `convex/schema.ts` — conversations table

#### Fields Modified

| Field | v1 | v2 |
|---|---|---|
| `status` | `active \| thinking \| error \| closed` | `active \| thinking \| error \| resolved \| paused` |
| `verdict` | `optional<"approved" \| "denied">` | **Remove.** Add `decision: optional<"buying" \| "skipping" \| "thinking">` |
| `verdictSummary` | `optional<string>` | **Rename** to `reactionText` |
| `shareScore` | `optional<number>` (5-99) | **Replace** with `hankScore: optional<number>` (1-10) |
| `disengagementCount` | `number` | **Rename** to `consecutiveNonAnswers` |

#### Fields Removed

| Field | Why |
|---|---|
| `stance` | Replaced by `intensity` |
| `score` | No running score in v2 |
| `stagnationCount` | Was patience meter. No patience in v2. |

#### Fields Added

| Field | Type | Purpose |
|---|---|---|
| `intensity` | `optional<string>` | Current intensity level (CURIOUS/PROBING/POINTED/WRAPPING) |
| `coverageRatio` | `optional<number>` | 0-1, for quick display without parsing lastAssessment |

#### Fields Unchanged

`userId`, `createdAt`, `category`, `estimatedPrice`, `item`, `lastAssessment`, `memoryReferenceCount`, `thinkingSince`

### 2.2 `convex/schema.ts` — other tables

**`verdictLedger` → `decisionLedger`**

| Field | Change |
|---|---|
| `verdict` | Replace with `decision: "buying" \| "skipping" \| "thinking"` |
| `verdictSummary` | Rename to `reactionText` |
| `hankScore` | **New** — 1-10 score at time of decision |

**`users` table**

| Field | Change |
|---|---|
| `deniedCount` | Rename to `skippedCount` |
| `savedTotal` | Unchanged — incremented on `decision: 'skipping'` |

**`shareCards` table**

`cardType: 'verdict'` → `cardType: 'decision'`
`VerdictCardData` → `DecisionCardData`:
- `verdict` → `decision`
- `shareScore` → `hankScore`
- `verdictSummary` → `reactionText`

**`llmTraces` table**

No schema change. The JSON string fields (`rawScores`, `sanitizedScores`, `scoringResult`) will contain new Compass data structures. The `decisionType` field gets new values: `normal`, `out-of-scope`, `directed-question`, `non-answer-warning`, `non-answer-disengaged`, `stagnation-warning`, `stagnation-disengaged`, `territory-exhausted`, `auto-resolve-buying`, `auto-resolve-skipping`, `user-resolve-buying`, `user-resolve-skipping`, `user-resolve-thinking`, `error`.

---

## Phase 3: Mutations

### 3.1 `convex/conversations.ts`

#### Mutation Renames

| v1 Mutation | v2 Mutation | Changes |
|---|---|---|
| `saveResponseWithScoring` | `saveResponseWithCompass` | Patches `intensity` + `coverageRatio` instead of `stance` + `score`. No `stagnationCount`. Patches `consecutiveNonAnswers` (was `disengagementCount`). |
| `saveResponseWithVerdict` | `saveResponseWithDecision` | Patches `decision` instead of `verdict`. `hankScore` instead of `shareScore`. `reactionText` instead of `verdictSummary`. Sets `status: 'resolved'` instead of `status: 'closed'`. Inserts into `decisionLedger` instead of `verdictLedger`. |
| `patchVerdictSummary` | `patchReactionText` | Same pattern, different field names. |

#### New Public Mutation: `resolve`

User-callable from the Decision Bar. This is the biggest structural addition.

```
resolve(conversationId, decision):
  1. Auth check (requireUser)
  2. Validate conversation belongs to user, status is 'active' or 'paused'
  3. If decision === 'thinking':
     - Set status = 'paused'
     - Return (no LLM call, no Hank Score)
  4. If decision === 'buying' or 'skipping':
     - Set status = 'thinking' (while generating reaction)
     - Schedule internal action: generateReaction(conversationId, decision)
```

```
generateReaction(conversationId, decision):
  1. Load conversation + messages + persisted context
  2. Compute Hank Score from coverage map
  3. Build reaction prompt with decision + hankScore + coverage summary
  4. LLM call → reaction text
  5. Call saveResponseWithDecision: insert reaction message, set resolved,
     write decision + hankScore + reactionText + decisionLedger entry
  6. If decision === 'skipping': increment user.savedTotal + user.skippedCount
```

#### `send` Mutation Changes

v1: checks `status !== 'closed'`
v2: checks `status !== 'resolved'`. If `status === 'paused'`, transition to `active` (user is resuming).

#### `listForUser` Query Changes

v1 returns: `verdict` badge
v2 returns: `decision` badge + `hankScore`

#### `internalGetPastConversations` Changes

Returns `decision` instead of `verdict`, `reactionText` instead of `verdictSummary`.

---

## Phase 4: Frontend

### 4.1 `src/types/chat.ts`

#### Types to Remove

```typescript
// Remove:
export type VerdictType = "denied" | "approved";
export interface Verdict { type: VerdictType; quote: string; }
export type Stance = "IMMOVABLE" | "FIRM" | "SKEPTICAL" | "RELUCTANT" | "CONCEDE";
```

#### Types to Add

```typescript
// Add:
export type DecisionType = 'buying' | 'skipping' | 'thinking';
export interface Resolution {
  decision: DecisionType;
  reactionText: string;
  hankScore: number;
  hankScoreLabel: string;
}
export type Intensity = 'CURIOUS' | 'PROBING' | 'POINTED' | 'WRAPPING';
```

#### Types to Modify

```typescript
// Update:
export type ConversationStatus = 'active' | 'thinking' | 'error' | 'resolved' | 'paused';
```

### 4.2 `src/components/VerdictCard.tsx` → `DecisionCard.tsx`

Complete replacement. New component.

**v1 VerdictCard showed:**
- "CASE CLOSED — DENIED/APPROVED: item ($price)" header
- `verdictSummary` text (or typing animation while Call 3 runs)
- Share button → `createVerdictCard`
- New conversation button

**v2 DecisionCard shows:**
- "You decided: BUYING IT / SKIPPING IT" header (user agency framing)
- Item + price
- Hank Score bar (1-10) with label ("Pure impulse", "Well-considered", etc.)
- Hank's reaction text (the shareable moment)
- Round count + best argument label (from coverage data)
- Share button → `createDecisionCard`
- New conversation button

### 4.3 Decision Bar Component (New)

A persistent component visible above the chat input after Hank's first response.

```
[ Buying it ]  [ Skipping it ]  [ Need to think ]
```

**UX rules from spec:**
- Visible above chat input, not blocking it
- No confirmation dialog — one tap = done
- "Need to think" pauses (doesn't close)
- Calls `resolve` mutation with the chosen decision
- Hidden when conversation is resolved

### 4.4 `src/components/MessageBubble.tsx` — Debug Bar Updates

The admin debug bar shows trace data. Update for v2 fields:

| v1 Debug Field | v2 Replacement |
|---|---|
| `previousStance → newStance` | `previousIntensity → newIntensity` |
| `score (±delta)` | **Remove.** Show `coverageRatio` instead. |
| `decisionType` badge | Same concept, new values (see Phase 2 llmTraces section) |
| Expandable TurnAssessment | New fields: `territory_addressed`, `response_type`, `evidence_tier`, `argument_type`, `contradiction` |
| Expandable ScoringResult | Replace with CompassResult: `intensity`, `nextTerritory`, `coverageRatio`, `coverageMap` |

**Decision type color map update:**
- `normal` → blue (same)
- `out-of-scope`, `directed-question` → zinc (same concept)
- `non-answer-warning` → yellow
- `non-answer-disengaged` → red
- `stagnation-warning` → yellow
- `stagnation-disengaged` → red
- `territory-exhausted` → orange
- `auto-resolve-buying`, `auto-resolve-skipping` → green
- `user-resolve-buying`, `user-resolve-skipping`, `user-resolve-thinking` → green
- `error` → red

### 4.5 `src/components/share/VerdictShareCard.tsx` → `DecisionShareCard.tsx`

Update for new data shape:
- `verdict` stamp → `decision` stamp ("BUYING IT" / "SKIPPING IT")
- `shareScore` bar (0-100) → `hankScore` bar (1-10) with label
- `verdictSummary` → `reactionText`

### 4.6 `src/lib/cards/types.ts`

`VerdictCardData` → `DecisionCardData`:
```typescript
interface DecisionCardData {
  decision: DecisionType;
  item?: string;
  estimatedPrice?: number;
  category?: string;
  reactionText?: string;
  hankScore?: number;
  hankScoreLabel?: string;
}
```

### 4.7 `src/hooks/useConversation.ts`

- Construct `Resolution` instead of `Verdict`
- Expose `hankScore`, `decision`, `reactionText`
- New `resolve(decision: DecisionType)` method that calls the `resolve` mutation
- Handle `resolved` and `paused` status

### 4.8 `src/components/ChatScreen.tsx`

- Render `DecisionCard` instead of `VerdictCard`
- Add `DecisionBar` component (visible after first Hank response when status is `active`)
- Handle `paused` status (show resume state)
- Update state from `useConversation` hook

### 4.9 `src/components/Sidebar.tsx` / `src/components/HistoryItem.tsx`

- Badge: `denied`/`approved` → `buying`/`skipping`/`thinking`
- Read `decision` instead of `verdict`
- Color scheme update (contextual instead of red/green binary)

---

## Phase 5: Voice

All prompt content changes from `hank-voice-v2.md`. These are text changes within `prompt.ts`, not structural.

### 5.1 Identity Block

**v1:** "You talk people out of buying things"
**v2:** "You ask the questions people avoid when they want to buy something"

The personality stays identical. The mechanism shifts from telling to asking.

### 5.2 The 8 Rules

Replace v1's 7 rules with v2's 8 rules:

1. Acknowledge the appeal before challenging
2. "I want it" is the opening, not the wall
3. Never say "you're an adult, your choice"
4. Never fold under confidence
5. Pattern recognition over escalation
6. Be wry, not mean
7. Name the behavior, never the character
8. Escalate care, not aggression

### 5.3 Sentence-Level Patterns

Inject into system prompt — these make Hank's voice recognizable:

- **Short sentences** — under 15 words default
- **Price as sentence fragment** — "$85 serum." "$400 air fryer."
- **Periods instead of question marks** — "What happened to the French press."
- **Stacked observations** — "First it was productivity. Then your friend got one. Pick one."
- **Noun-phrase closers** — "Third one this month." "A $200 candle." "The midnight scroll."

### 5.4 Signature Moves

Four recurring behaviors for the system prompt:

1. **The Callback** — quotes user's words back (this or past conversations)
2. **The Quiet Read** — one-line observation, no follow-up, let it hang
3. **The Pattern Call** — names behavioral patterns as data
4. **The Meta Moment** — dry self-awareness about his own role

### 5.5 Recurring Hank-isms

Phrases for the system prompt's voice section:
- "There it is." — The reveal
- "You've got a type." — Pattern-calling
- Price as opening fragment — every conversation
- "Be honest." / "Be specific." — two-word stakes-raisers
- "Noted." / "Interesting." — quiet reads (sparingly)
- "[Item] stays." — verdict closer energy

### 5.6 Voice Examples

Replace v1 examples with v2 categories from hank-voice-v2.md:
- Acknowledging + questioning
- Controlled sharpness (the sting)
- Observational humor
- Perception (noticing what matters)
- Product roasting (the safe target)
- Analogies (aimed at the logic)
- Warmth through attention (not statements)

### 5.7 Anti-Examples (Expanded)

v1 banned: therapy-speak, generic sympathy.

v2 adds bans for:
- "Told you so" energy — no preemptive shaming, no gloating
- Category dismissiveness — every purchase gets the same serious examination
- "You're emotional" framing — name the emotion, don't dismiss via it
- Punitive withdrawal — disengage with "I've done what I can", not silent treatment
- Competitive scoring language — no teacher-grading-student tone
- Identity-level financial judgments — name behavior, not character
- Prosecutorial questions — no leading accusations, no cross-examination language

### 5.8 Conversation Phase Guidance

Replace v1's generic turn-based advice with v2's intensity-mapped phases:

| Phase | Intensity | Energy |
|---|---|---|
| Early | CURIOUS | "I'm here, I'm listening, this might be totally reasonable." |
| Mid | PROBING | "I'm paying attention. I notice things. And I will bring them up." |
| Late | POINTED | "The real conversation starts now." |
| Wrapping | WRAPPING | "I've done my job. This is yours now." |

### 5.9 Reaction Matrix

New prompt content for the `buildReactionPrompt` function. Each cell in the matrix has tone guidance and example lines. See the full matrix in Phase 1.3 (`buildReactionPrompt` section).

---

## Phase 6: Extras

### 6.1 Contradiction Tracking

Ships with engine core (Phase 1) but can be simplified in initial implementation.

**Full spec:** LLM detects contradictions via the `contradiction` field in Call 1. Three severity tiers (refinement/soft/hard). Hard contradictions degrade territory depth. Contradictions get Priority 0 in territory assignment.

**Minimum viable:** Store all soft/hard contradictions. Surface in territory assignment prompt. Degradation on hard. Resolution when user addresses with direct_counter + specific evidence.

**Implementation touches:**
- `compass.ts`: `updateCoverage` handles contradiction degradation + storage
- `compass.ts`: `assignTerritory` checks for unresolved contradictions (Priority 0)
- `prompt.ts`: `buildAssessmentPrompt` includes contradiction detection instructions in tool description
- `prompt.ts`: `buildSystemPrompt` includes contradiction context in territory assignment block
- `generate.ts`: `executeCompass` stores contradictions in PersistedContext

### 6.2 Follow-Up System

Ships after core decision flow is stable. Replaces the v1 `ReEngagementModal` with a 3-layer approach.

**What exists in v1:** `ReEngagementModal` (modal popup on login), `getPendingOutcomes` query, `recordOutcome` mutation, 7-day auto-expiry cron. Appeal flow on denied verdicts.

**What changes for v2:**
- The question shifts from "what did you do after Hank's verdict?" to "did you follow through on YOUR decision?"
- No appeal flow — paused conversations handle "still thinking"
- Hank Score adds accountability dimension to follow-up reactions
- No "still thinking" follow-up option — that's the Decision Bar's job

#### Schema additions

| Field | Table | Type |
|---|---|---|
| `outcome` | `conversations` | `optional<"purchased" \| "skipped" \| "unknown">` |
| `outcomeRecordedAt` | `conversations` | `optional<number>` |

#### Implementation touches

**Layer 1 — Inline Greeting Nudge:**
- `convex/conversations.ts`: `getPendingFollowUps` query — resolved conversations within 7-day window with no outcome
- `src/components/ChatScreen.tsx`: render follow-up card below greeting when pending items exist
- `convex/conversations.ts`: `recordOutcome` mutation — sets outcome, updates savedTotal if outcome is "skipped" and wasn't already counted
- Remove `ReEngagementModal` component

**Layer 2 — Dedicated Follow-Ups Page:**
- New route `/follow-ups`
- New component `FollowUpsPage.tsx` — card list of all pending items
- Sidebar nav entry with badge count

**Layer 3 — Sidebar Badge + History Outcomes:**
- `src/components/Sidebar.tsx`: badge count from `getPendingFollowUps`
- `src/components/HistoryItem.tsx`: outcome badge (SAVED/BOUGHT) replaces decision badge after outcome recorded

**Gamification:**
- Save streak calculation in `stats.ts`
- Hank reaction lines for each outcome × decision combination (see `hank-v2.md` section 11)

**Cron:**
- Auto-expire unrecorded outcomes to `unknown` after 7 days (same as v1)

### 6.3 Memory v2

Ships after core engine. Enhances the existing memory system.

**Changes from v1:**
1. Fetch memory data on turn 1 (was turn 2)
2. Select up to 3 same-category conversations (was 1)
3. Memory-armed territory assignment: `pattern` territory gets priority boost when memory data exists
4. Territory-specific prompt injection: memory shows up differently depending on assigned territory

**Implementation touches:**
- `memory.ts`: `selectMemoryNudges` (plural) — returns up to 3
- `memory.ts`: `formatNudgePrompt` updated for territory-specific injection
- `compass.ts`: `assignTerritory` accepts `memoryNudges` parameter
- `generate.ts`: fetch memory on turn 1, store in PersistedContext
- PersistedContext: new `memoryNudges` field

---

## V1 Remnant Checklist

Every v1 concept and every file it lives in. Check each one during implementation to verify complete removal.

### Concept: Stance (IMMOVABLE → CONCEDE)

| File | What to change |
|---|---|
| `convex/llm/scoring.ts` | Remove `Stance` type, `STANCE_ORDER`, `determineStance`, `applyStanceGuardrails` |
| `convex/llm/prompt.ts` | Remove `STANCE_INSTRUCTIONS` record, all stance references in prompts |
| `convex/llm/generate.ts` | Remove all `stance` variables, `currentStance` in ConversationState |
| `convex/schema.ts` | Remove `stance` field from conversations table |
| `convex/conversations.ts` | Remove `stance` from all patches and query returns |
| `src/types/chat.ts` | Remove `Stance` type |
| `src/components/MessageBubble.tsx` | Remove stance display in debug bar |

### Concept: Running Score

| File | What to change |
|---|---|
| `convex/llm/scoring.ts` | Remove `computeTurnDelta`, `getStartingScore`, `ScoringResult` |
| `convex/llm/generate.ts` | Remove `runningScore` from ConversationState, all score accumulation logic |
| `convex/schema.ts` | Remove `score` field from conversations table |
| `convex/conversations.ts` | Remove `score` from all patches and query returns |
| `src/components/MessageBubble.tsx` | Remove `score (±delta)` from debug bar |

### Concept: Patience / Stagnation

| File | What to change |
|---|---|
| `convex/llm/generate.ts` | Remove all patience logic (drain/increment, patience-denied branch) |
| `convex/llm/prompt.ts` | Remove patience warnings from `buildAssessmentPrompt` and `buildSystemPrompt` |
| `convex/schema.ts` | Remove `stagnationCount` field from conversations table |
| `convex/conversations.ts` | Remove `stagnationCount` from all patches |

### Concept: Collapse

| File | What to change |
|---|---|
| `convex/llm/generate.ts` | Remove collapse check (`newRunningScore < -5 AND turnCount > 3`) |

### Concept: Auto-Closing / Verdict

| File | What to change |
|---|---|
| `convex/llm/generate.ts` | Remove CONCEDE auto-close, disengagement-denied auto-close, patience-denied auto-close, collapse-denied auto-close, user_backed_down auto-close |
| `convex/llm/prompt.ts` | Remove `buildCloserPrompt` (replace with `buildReactionPrompt`), remove `buildVerdictSummaryPrompt`, remove `buildClosingToolDefinition` (replace with reaction tool) |
| `convex/schema.ts` | Remove `verdict` field, `closed` status |
| `convex/conversations.ts` | Remove `saveResponseWithVerdict` (replace with `saveResponseWithDecision`), remove `patchVerdictSummary` (replace with `patchReactionText`) |

### Concept: Verdict / DENIED / APPROVED (terminology)

| File | What to change |
|---|---|
| `convex/verdictLedger.ts` | Rename file to `decisionLedger.ts`, rename fields |
| `convex/shareCards.ts` | `createVerdictCard` → `createDecisionCard`, update data shape |
| `convex/stats.ts` | `deniedCount` → `skippedCount`, reframe all stats |
| `src/types/chat.ts` | Remove `VerdictType`, `Verdict` |
| `src/components/VerdictCard.tsx` | Replace with `DecisionCard.tsx` |
| `src/components/share/VerdictShareCard.tsx` | Replace with `DecisionShareCard.tsx` |
| `src/lib/cards/types.ts` | `VerdictCardData` → `DecisionCardData` |
| `src/hooks/useConversation.ts` | `verdict` → `resolution` |
| `src/components/ChatScreen.tsx` | `VerdictCard` → `DecisionCard` |
| `src/components/Sidebar.tsx` | `verdict` → `decision` |
| `src/components/HistoryItem.tsx` | Badge: denied/approved → buying/skipping/thinking |

### Concept: ShareScore (5-99)

| File | What to change |
|---|---|
| `convex/llm/scoring.ts` | Remove `computeShareScore` |
| `convex/schema.ts` | Remove `shareScore`, add `hankScore` |
| `convex/conversations.ts` | All patches and queries |
| `src/components/VerdictCard.tsx` | Replace with hankScore display |
| `src/components/share/VerdictShareCard.tsx` | Replace bar rendering |

### Concept: v1 TurnAssessment Fields

| Field | File | What to do |
|---|---|---|
| `challenge_addressed` | `scoring.ts`, `prompt.ts` (tool def) | Remove — replaced by `response_type` + `territory_addressed` |
| `evidence_provided` | `scoring.ts`, `prompt.ts` (tool def) | Remove — replaced by `evidence_tier` |
| `new_angle` | `scoring.ts`, `prompt.ts` (tool def) | Remove — replaced by `argument_type` |
| `user_backed_down` | `generate.ts`, `prompt.ts` (tool def) | Remove — replaced by `user_resolved: 'skipping'` |

### Concept: ThresholdMultiplier / PriceModifier

| File | What to change |
|---|---|
| `convex/llm/scoring.ts` | Remove `computePriceModifier`, `thresholdMultiplier` from ScoringResult |
| `convex/llm/generate.ts` | Remove all threshold/priceModifier logic |

---

## Files Unchanged

These files need no changes or only trivial import updates:

| File | Status | Notes |
|---|---|---|
| `convex/llm/moves.ts` | **Unchanged** | Rhetorical move detection is prompt-only. The 6 move patterns and `extractRecentMoves`/`buildRecentMovesSection` functions work identically in v2. |
| `convex/llm/workHours.ts` | **Unchanged** | Work-hours calculation from income. Injected into system prompt same as v1. |
| `convex/llm/memory.ts` | **Minor update** | Base system unchanged. `selectMemoryNudge` → `selectMemoryNudges` (returns up to 3). `formatNudgePrompt` updated for territory-specific injection. Core architecture (selection, rotation, formatting) preserved. |
| `convex/stats.ts` | **Content rewrite** | Same query shape, different field names and framing. |
| `convex/auth.ts` | **Unchanged** | Auth flow unaffected. |
| `convex/credits.ts` | **Unchanged** | Credit system unaffected. |
| `convex/users.ts` | **Minor** | `deniedCount` → `skippedCount` in any references. |
| `convex/llmTraces.ts` | **Unchanged** | Schema is untyped JSON strings. New data shapes flow through automatically. |
| `convex/appSettings.ts` | **Unchanged** | Model selection, feature flags. |
| `convex/lib/roles.ts` | **Unchanged** | Auth helpers. |
| `src/components/Sidebar.tsx` | **Minor** | Read `decision` instead of `verdict`. Badge display update. |
| `src/components/StatsScreen.tsx` | **Minor** | Consume updated stats query. Reframe labels. |
| Landing page components | **Unchanged** | Static marketing. |
| Stripe / webhook code | **Unchanged** | Payment flow unaffected. |
| `convex/replayCuts.ts` | **Minor** | Field name updates in denormalized data. |

---

## Implementation Order Summary

### Phase 1: Engine Core (no UI changes needed to test)
1. Create `convex/llm/compass.ts` — all types + pure functions
2. Rewrite `convex/llm/prompt.ts` — new tool schema, intensity guidance, territory assignment, v2 voice
3. Rewrite `convex/llm/generate.ts` — `executeCompass`, remove auto-closure, update Call 2 prompt selection
4. Update `convex/conversations.ts` — `saveResponseWithCompass`, field renames

**Test:** Conversations work end-to-end with coverage tracking and intensity progression. Frontend shows old UI but backend is v2.

### Phase 2: Schema + Decision Flow
5. Schema migration — new status values, new fields, renames
6. Add `resolve` mutation + `generateReaction` action
7. Build Decision Bar component
8. Build `DecisionCard` component (replaces `VerdictCard`)

### Phase 3: Frontend Updates
9. Update `ChatScreen`, `useConversation` hook
10. Update `Sidebar`, `HistoryItem` — decision badges
11. Update `MessageBubble` debug bar — compass data
12. Update share card components + types

### Phase 4: Stats + Ledger
13. `stats.ts` rewrite — new metrics, reframed labels
14. `verdictLedger.ts` → `decisionLedger.ts`
15. Share card mutations + rendering

### Phase 5: Extras (ship after core is stable)
16. Contradiction tracking refinements
17. Memory v2 (multi-nudge, territory-aware injection)

### Phase 6: Follow-Up System
18. Schema additions (`outcome`, `outcomeRecordedAt` on conversations)
19. Inline greeting nudge — `getPendingFollowUps` query, follow-up card component, `recordOutcome` mutation
20. Remove `ReEngagementModal`
21. Dedicated follow-ups page (`/follow-ups`) + sidebar badge
22. History item outcome badges (SAVED/BOUGHT)
23. Gamification — save streak, Hank reaction lines per outcome × decision
24. Auto-expiry cron (7-day window → `unknown`)

### Phase 7: Cleanup
25. Delete `scoring.ts` (replaced by `compass.ts`)
26. Delete `VerdictCard.tsx` (replaced by `DecisionCard.tsx`)
27. Full V1 Remnant Checklist pass — grep for `stance`, `verdict`, `DENIED`, `APPROVED`, `shareScore`, `stagnationCount`, `patience`, `collapse`
