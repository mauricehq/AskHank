# Hank's Scoring Engine (v3)

## What Changed (v2 → v3)

v2 was a checklist game. The LLM extracted 20+ purchase facts (intent, frequency, urgency, current solution, alternatives, beneficiary, etc.) and the code scored how many boxes were checked. Users could ignore Hank's pushback entirely, dump 3 fact-packed messages hitting every algorithm factor, and win — even on a private jet.

Three structural problems:
1. **Info-dumping won.** Three optimized messages covering every scoring factor = concession. Didn't matter what Hank said.
2. **Short responses were punished.** A punchy one-sentence counter to Hank's exact question barely moved the score. A paragraph mentioning frequency, urgency, and alternatives jumped it.
3. **It wasn't a conversation.** The score was about the purchase, not the argument. Hank was decorative — his pushback didn't affect the outcome.

v3 shifts to debate-based scoring: the score accumulates turn by turn based on how well the user counters Hank's specific pushback.

---

## The Principle

Same as v2: **The LLM classifies. The function scores. Hank delivers.**

The LLM cannot be trusted to decide when to concede — it folds under pressure. The scoring engine is the guardrail that prevents sycophancy from killing the product.

v3 changes **what** we classify: from "what facts exist about this purchase" to "how well did they respond to Hank this turn."

```
v2:  Score = f(purchase facts extracted from full conversation)
     → conversation is a fact-extraction pipe

v3:  Score = f(how well they argue, turn by turn)
     → conversation IS the scoring mechanism
```

---

## How It Works

### Turn 1: Context

User states what they want. The LLM extracts lightweight context:

| Field | Type | Purpose |
|-------|------|---------|
| `item` | string | What they want ("MacBook Pro", "Factorio") |
| `estimated_price` | number | User-stated or LLM-estimated price in USD |
| `category` | enum | electronics, cars, fashion, furniture, essentials, safety_health, other |
| `intent` | enum | want, need, replace, upgrade, gift |

No debate score yet — there's no pushback to counter. This sets difficulty and gives Hank his opening angle.

**Intent sets starting score** (the only "checklist" element):

| Intent | Starting Score | Rationale |
|--------|---------------|-----------|
| `replace` | +8 | Real problem exists — head start |
| `need` | +5 | Filling a gap, some inherent justification |
| `upgrade` | +3 | Something works, want better — small credit |
| `gift` | +2 | Gesture, but not urgent |
| `want` | +0 | Pure desire, earn it all through debate |

### Turn 2+: Debate Scoring

Each turn, the LLM classifies with four binary questions:

| Field | Description |
|-------|-------------|
| `challenge_addressed` | Did they respond to what Hank specifically asked or challenged? |
| `evidence_provided` | Did they give specific facts, numbers, or concrete details? |
| `new_angle` | Did they introduce something Hank hasn't heard yet? |
| `emotional_reasoning` | Is emotion the PRIMARY justification this turn? |

Plus `challenge_topic` (brief label of what was addressed) and four flag booleans (`is_non_answer`, `is_out_of_scope`, `user_backed_down`, `is_directed_question`).

### Score Deltas

`challenge_addressed` is the gate. You MUST engage with Hank to earn points.

```
If challenge_addressed:
  base:               +8
  + evidence_provided: +5
  + new_angle:         +3
  ─────────────────────────
  max:                +16 per turn

If NOT challenge_addressed:
  base:               +0
  + evidence_provided: +2  (some credit for facts, but you dodged)
  + new_angle:         +1  (new info, but off-topic)
  ─────────────────────────
  max:                +3 per turn

emotional_reasoning:   -3  (stacks with above)
non_answer:            -5  (replaces above entirely)
```

**Why this works:**
- Short, punchy responses that nail the counter: +8 minimum, often +11-13.
- Info-dumps that ignore Hank's question: +2-3 max.
- "I just want it" with nothing else: -5 (non-answer) or +0 (no challenge addressed).

---

## Stance Thresholds

Running score accumulates across turns. Stance determined by score vs price-adjusted thresholds.

**Base thresholds:**

| Score Range | Stance |
|-------------|--------|
| 0–8 | IMMOVABLE |
| 9–18 | FIRM |
| 19–30 | SKEPTICAL |
| 31–42 | RELUCTANT |
| 43+ | CONCEDE |

**Price adjusts thresholds** using a log curve:

```
thresholdMultiplier = clamp(1.0 + 0.3 × ln(price / 100), 0.6, 1.5)
```

No MAX_OFFSET cap — per-turn scoring is already bounded at +16, so scores can't explode.

### What This Feels Like

**$35 game (multiplier ~0.69):**
- CONCEDE threshold: 43 × 0.69 ≈ 30
- 2 strong turns (16+16=32) → concession
- Feels like: quick, fun argument

**$350 headphones (multiplier ~1.37):**
- CONCEDE threshold: 43 × 1.37 ≈ 59
- 4 strong turns → concession
- Feels like: real conversation, Hank makes you work

**$2,000 MacBook (multiplier ~1.50, capped):**
- CONCEDE threshold: 43 × 1.50 ≈ 65
- 4-5 strong turns → concession
- Feels like: serious debate, but winnable

---

## Guardrails

**Pace cap:** Stance advances at most one level per turn. Even if you score +16 and pass multiple thresholds, you move one step.

**Turn 1-2 floor:** Minimum stance is FIRM (no IMMOVABLE on opening).

---

## Case Closure

| Condition | Trigger | Result |
|-----------|---------|--------|
| Non-answer | 2 consecutive non-answers | Denied |
| Patience exhausted | Patience meter reaches 10+ | Denied |
| Collapse | Score < -5 after turn 3 | Denied |
| User backs down | "Yeah you're right" etc. | Denied |

**Patience** is a meter that drains at different rates based on turn type. Zero-delta turns drain +3, directed questions drain +1, and positive-delta turns restore -4 (floor 0). Turn 1 is exempt (patience stays 0). Warnings escalate: waning (4-5), thin (6-7), final (8-9), auto-deny (10+). A strong argument can fully recover patience from any warning level. No recovery cap — the score system handles convergence for engaged users.

**Collapse** prevents users from digging an emotional hole indefinitely. A "want" opener (score 0) + one emotional turn (-3) = -3, not great but recoverable. Past -5 after turn 3, it's a pattern.

---

## Context Carry-Forward

Four context fields persist across turns (stored in `lastAssessment`):

| Field | Carry-forward rule |
|-------|--------------------|
| `item` | Update if LLM returns non-"unknown" value |
| `estimated_price` | Update if LLM returns > 0 |
| `category` | Update if LLM returns non-"other" value |
| `intent` | Keep from turn 1 unless LLM returns non-"want" |

Plus `turnSummaries[]` — a per-turn log of delta, topic, addressed, evidence. Fed back into Hank's system prompt as DEBATE PROGRESS so he attacks the weakest points.

No monotonic coalescing, no array unions — dramatically simpler than v2.

---

## Item & Price Evolution

Score carries over when items or prices change. Thresholds recalculate.

- **Downgrade** (MacBook → Chromebook): thresholds drop, may cross CONCEDE immediately
- **Scope creep** (mic → streaming setup): thresholds rise, need more turns
- **Pivot** (headphones → speakers): item updates, score preserved

---

## Decision Flow

```
1. is_out_of_scope      → deflect (no score change)
2. previous CONCEDE     → auto-approve
3. user_backed_down     → denied (Hank wins)
4. is_non_answer + ≥1   → denied (disengagement closure)
5. is_non_answer (1st)  → warning, score -5
6. is_directed_question → patience +1, no score change
      - patience ≥ 10 → denied
7. Normal turn:
   a. Turn 1: delta = getStartingScore(intent)
   b. Turn 2+: delta = computeTurnDelta(assessment)
   c. newScore = runningScore + delta
   d. Patience: turn1 → 0, delta>0 → max(0, patience-4), else → patience+3
   e. Collapse check: score < -5 AND turn > 3 → denied
   f. Patience check: patience ≥ 10 → denied
   g. Determine stance from score
   h. Apply guardrails (pace cap, floor)
```

---

## Trace Data

Three distinct slots in each LLM trace:

| Slot | Contains |
|------|----------|
| `rawScores` | Sanitized TurnAssessment (what the LLM classified this turn) |
| `sanitizedScores` | Persisted context (item, price, intent, turnSummaries) |
| `scoringResult` | ScoringResult (runningScore, delta, stance, thresholdMultiplier, priceModifier) |

Decision types: `normal`, `normal (stance capped)`, `casual`, `out-of-scope`, `directed-question`, `concede`, `user-backed-down`, `disengagement-increment`, `disengagement-denied`, `patience-denied`, `collapse-denied`, `error`.

---

## Files

| File | Role |
|------|------|
| `convex/llm/scoring.ts` | Types (TurnAssessment, ScoringResult, Stance, Intent), delta calculation, stance determination, guardrails, price modifier |
| `convex/llm/prompt.ts` | Tool definition (get_stance schema), system prompt builder, debate progress injection |
| `convex/llm/generate.ts` | Orchestration: sanitization, context carry-forward, executeGetStance decision tree, two-call LLM pattern, trace capture |
| `convex/llm/moves.ts` | Rhetorical move detection (prompt-only, doesn't affect scoring) |
| `convex/schema.ts` | `conversations.stagnationCount` repurposed for patience meter (same type) |
