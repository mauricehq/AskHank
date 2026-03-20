# Hank Banger System

Punchy mic-drop moments fired sparsely when the data warrants it. A banger is a setup + punchline — a reframe of the situation followed by an analogy or observation that lands. The banger is forced when earned: a dedicated LLM call whose only job is the mic drop.

Pattern reference: Hopshelf `lib/advisor/advisorBanger.ts`

---

## Core Principle: Setup + Punchline

The banger is NOT a 2-8 word fragment. It's a two-part moment:

1. **Setup:** Reframe the situation with precision
2. **Punchline:** An analogy, observation, or mirror that lands

Examples of the target voice:

- "A $350 espresso machine for a Keurig person. That's like buying a Ferrari to drive to your desk job."
- "Novelty's a hell of a drug, but routine's the dealer."
- "You're describing a $30 problem. Walk me through how you got to $500."
- "Investment pieces. That's always code for 'expensive and I know it.'"
- "So you've got a perfectly good one at home. This isn't about the coffee. It's about the countertop."

Let the LLM be creative. Don't over-constrain word count or structure. The prompt sets the tone and context; the LLM delivers the moment.

---

## Architecture

A dedicated **Call 3** after Hank's main response. Not injected into Call 2. Not optional for the LLM to skip. When the scorer says fire, the banger fires.

```
User message
  → Call 1: Assessment (classify arguments, contradictions, emotions)
  → Compass: Territory assignment
  → Call 2: Hank's response (clean — no banger instructions polluting it)
  → Banger scorer: Did this turn earn a banger?
  → If yes → Call 3: Generate banger (sole mission, forced output)
  → Append banger to response with line break
```

### Why a Separate Call

- **Call 2 stays clean.** No conflicting instructions. Hank focuses on Socratic questioning.
- **Deterministic.** We KNOW if a banger fired — it's a separate call, not a "maybe" instruction.
- **Focused prompt.** Call 3's only job is the mic drop. One mission, no noise.
- **Full context.** Call 3 has Hank's response as input, so the banger can build on what was just said.
- **No quality guessing.** If it fires, it fires. The prompt does the quality work, not a post-processing regex.

### Implementation

- `bangerFiredThisTurn: boolean` tracked per turn in PersistedContext
- `bangerCount: number` tracking total bangers in the conversation
- Scoring function runs after Call 2 completes
- Call 3 is a small, fast LLM call (Haiku, low max tokens)

---

## 5 Tones

| Tone | Direction (injected into Call 3 prompt) | When It Fires |
|------|----------------------------------------|---------------|
| `mirror_crack` | "Reflect their own logic back — the contradiction does the work, not your judgment. Setup: restate what they said. Punchline: the gap." | User contradicted themselves |
| `dead_shrug` | "Withdraw energy. The flatness is the point. Setup: acknowledge what they said. Punchline: let the silence do the work." | User stopped engaging honestly, repeating themselves |
| `slow_knife` | "Name the real thing underneath the purchase — the itch they're actually scratching. Setup: reframe what they described. Punchline: what it's really about." | Emotional reasoning exposed after rational facade |
| `time_check` | "Invoke the future. Setup: describe the purchase in present tense. Punchline: what it looks like in three weeks." | Novelty/trend-driven purchase |
| `wry_salute` | "Concede with respect — they made the case. Setup: acknowledge what they brought. Punchline: dry, grudging respect." | User genuinely made a strong case (~10-15%) |

### Tone Distribution (Target)

- `slow_knife`: ~30% (emotional purchases are the majority)
- `mirror_crack`: ~25% (contradictions surface naturally)
- `time_check`: ~20% (novelty purchases are frequent)
- `dead_shrug`: ~15% (defensive users, repeat justifiers)
- `wry_salute`: ~10% (matches the ~10-15% concession rate)

---

## Triggers

### First Conversation Triggers

The banger system is active from conversation 1. These triggers require zero memory — they fire from the current conversation's data alone:

- `live_contradiction` — user contradicts themselves across turns
- `emotional_crumble` — rational facade drops, emotional reasoning surfaces
- `argument_wall` — repeating the same argument 3x
- `dodge_pattern` — avoiding a territory Hank keeps probing
- `evidence_upgrade` — brought real evidence after vague claims
- `full_coverage` — examined every territory thoroughly

Hook users on the first conversation. Show the value immediately. Don't gate personality behind a history requirement.

### Scoring

- Tier 1 triggers: +2 points each
- Tier 2 triggers: +1 point each
- Tier 3 triggers: +1 point each
- Threshold to fire: ≥2 points (a single Tier 1 can fire solo)

### Tier 1 — Receipts (+2 pts)

#### `live_contradiction`
User directly contradicts something they said in an earlier turn, unresolved.
```
contradictions.filter(c => c.severity === "hard" && !c.resolved).length >= 1
```
**Data:** `PersistedContext.contradictions[]`
**Tone:** `mirror_crack`

#### `category_relapse`
3+ past conversations in the same category, >60% resulted in buying.
```
sameCategoryPast.length >= 3 && (buyCount / sameCategoryPast.length) > 0.6
```
**Data:** `pastConversations[]` filtered by category
**Tone:** `slow_knife`
**Requires:** 3+ past conversations

#### `emotional_crumble`
3+ non-emotional turns then switched to emotional reasoning.
```
last 3+ turns: emotionalReasoning === false
current turn: emotionalReasoning === true
```
**Data:** `PersistedContext.turnSummaries[].emotionalReasoning`
**Tone:** `slow_knife`

#### `price_shock`
Current price ≥3x the user's median past price.
```
currentPrice >= medianPastPrice * 3 (requires 3+ past conversations with prices)
```
**Data:** `pastConversations[].estimatedPrice`
**Tone:** `time_check`
**Requires:** 3+ past conversations

### Tier 2 — Solid Signal (+1 pt)

#### `full_coverage`
All relevant territories have reached "explored" or "settled" depth.
```
allRelevantTerritories.every(t => depth >= "explored") && relevantCount >= 4
```
**Data:** `PersistedContext.coverageMap`
**Tone:** `wry_salute`

#### `argument_wall`
3 consecutive turns of `argument_type === "same_as_before"`.
```
lastThreeSummaries.every(s => s.argumentType === "same_as_before")
```
**Data:** `PersistedContext.turnSummaries[].argumentType`
**Tone:** `dead_shrug`

#### `skip_streak`
3+ consecutive skipping decisions in recent history.
```
recentDecisions starting from most recent: 3+ consecutive "skipping"
```
**Data:** `pastConversations[].decision`
**Tone:** `wry_salute`
**Requires:** 3+ past conversations

#### `evidence_upgrade`
Evidence tier jumped from assertion/none → specific/concrete in the same territory.
```
territory's bestEvidence is now specific/concrete
AND first turn addressing that territory had assertion/none
```
**Data:** `PersistedContext.turnSummaries[].evidenceTier` + `coverageMap`
**Tone:** `wry_salute`

#### `category_debut`
First conversation in this purchase category (not first conversation ever).
```
pastConversations.filter(c => c.category === currentCategory).length === 0
&& pastConversations.length >= 1
```
**Data:** `pastConversations[].category`
**Tone:** `slow_knife`
**Requires:** 1+ past conversations

#### `dodge_pattern`
Territory assigned 2+ times but still at "touched" depth.
```
territoryAssignmentCounts[territory] >= 2 && coverageMap[territory].depth === "touched"
```
**Data:** `PersistedContext.territoryAssignmentCounts` + `coverageMap`
**Tone:** `mirror_crack`

#### `work_hours_bomb`
Item costs 20+ hours of the user's work time.
```
workHours.hoursEquivalent >= 20
```
**Data:** `estimated_price` + `userInfo.incomeAmount/incomeType`
**Tone:** `time_check`

### Tier 3 — Color (+1 pt)

#### `first_chat`
Zero past conversations.
```
pastConversations.length === 0
```
**Tone:** `slow_knife`

#### `savings_milestone`
Skipping would push savedTotal past a round milestone ($100, $250, $500, $1K, $2.5K, $5K, $10K).
```
savedTotal < milestone && (savedTotal + currentPrice) >= milestone
```
**Data:** `userInfo.savedTotal` + `estimated_price`
**Tone:** `wry_salute`
**Requires:** 1+ past conversations

#### `speedrun`
Reached WRAPPING intensity in ≤3 turns.
```
intensity === "WRAPPING" && turnSummaries.length <= 3
```
**Tone:** `wry_salute`

#### `flip_flop`
Opposite decision from last conversation in same category.
```
lastSameCategoryDecision !== currentDecision
```
**Data:** `pastConversations[]` filtered by category
**Tone:** `mirror_crack`
**Requires:** 1+ past conversations

---

## Cross-Conversation Memory Triggers

These unlock as history accumulates. They're the sharpest expression of "this thing knows me." Note: the banger system itself is active from conversation 1 — these are additional triggers that become available with data.

| Min Convos | Trigger | Signal |
|------------|---------|--------|
| 2 | `promiseBroken` | Skipped an item in this category before. Back again. |
| 2 | `relapsePurchaser` | Said they'd skip, follow-up caught they bought it. Back again. |
| 3 | `midnightScroller` | 3+ conversations after 10pm local time. Current one too. |
| 4 | `categoryRepeat` | 3+ convos in same category within 90 days |
| 4 | `spendingEscalation` | Average price in category doubling over time |
| 5 | `scoreTrajectory` | Hank Scores trending down over last 5+ conversations |

### Memory Banger Rule: Imply, Don't Cite

"You and electronics again." > "This is your fifth electronics purchase in 90 days."

Hank is a friend who pays attention, not a dashboard. The user should think "how does he remember that" — not "he's reading my data back to me."

---

## Timing & Scarcity

### When Bangers Can Fire

| Intensity | Policy |
|-----------|--------|
| CURIOUS | Blocked — too early, no material yet |
| PROBING | Eligible — only Tier 1 triggers can fire solo |
| PRESSING | Peak eligibility — most bangers fire here |
| WRAPPING | Eligible — natural spot for parting shot |

- **Turn 3+ only.** Bangers need enough conversation context to land.
- **Max 2-3 per conversation.** Not every turn, but not capped at 1 either. Multiple moments can be earned.
- **Minimum 2 turns apart.** If a banger fired on turn 3, the next eligible turn is 5.
- **Target fire rate: 20-30%** of turns that meet the threshold. Most conversations will have 0-1 bangers. A great 7-turn conversation might have 2.
- **No cross-conversation cooldown.** Natural variance handles spacing.

### Response Format When Banger Fires

```
[Hank's normal response from Call 2]

[Banger from Call 3 — setup + punchline, appended with line break]
```

The banger is appended to Call 2's response. It's part of Hank's message, not a separate UI element.

---

## The Call 3 Prompt

A small, focused prompt. Sole mission: deliver the mic drop.

```
You are Hank. Dry, sharp, thinks in analogies. You just said something to a user about their purchase. Now land it.

Write a banger — a setup and a punchline. The setup reframes what's happening. The punchline is an analogy, observation, or mirror that makes them stop and think.

ITEM: [item] ($[price])
WHAT JUST HAPPENED: [1-sentence summary of this turn — e.g. "User admitted their current one works fine but wants the upgrade anyway"]
TONE: [tone direction]

Examples of what lands:
- "A $350 espresso machine for a Keurig person. That's like buying a Ferrari to drive to your desk job."
- "You're describing a $30 problem. Walk me through how you got to $500."
- "Investment pieces. That's always code for 'expensive and I know it.'"
- "Novelty's a hell of a drug, but routine's the dealer."

Rules:
- Be specific to THIS purchase and THIS conversation. Generic lines are worse than nothing.
- Setup + punchline. Two parts. Not a paragraph, not a single word.
- No emojis, no markdown, no asterisk actions.
- No meta-language ("Mic drop", "Pattern detected", "Think about it").
- The punchline comes from precision, not cruelty. Sharp, not mean.
- Just write the banger. No preamble, no explanation.
```

### What Gets Fed to Call 3

- `item` and `price` from PersistedContext
- `whatJustHappened`: a 1-sentence summary derived from the assessment (e.g., "User contradicted their earlier claim about not needing it" or "User's third electronics purchase this month")
- `tone`: the selected tone direction string
- `hankResponse`: Call 2's full response (so the banger can build on it)

---

## Decision Card Integration

**Both.** Banger fires in conversation as part of Hank's message AND the best banger from the conversation echoes on the Decision Card as a `parting_shot` field.

- **In conversation:** The banger is appended to Hank's response. Same message bubble. Natural reading flow.
- **On Decision Card:** The strongest banger from the conversation appears as a `parting_shot` field. Styled as a pull-quote. Absent when no banger fired.

Two sharing vectors:
- Chat screenshot → "look what this AI said to me" (reaction-based)
- Decision Card → "look at my score + Hank's parting shot" (identity-based)

---

## Quality Gate

Minimal. The prompt does the quality work. Post-processing only catches garbage:

- No emojis
- No meta-language ("mic drop", "boom", "plot twist", "pattern detected")
- No first-person ("I think", "I'd say")
- Max ~40 words (generous — allow the setup + punchline structure room to breathe)

**If a banger fails the gate, strip it silently.** A missing banger is invisible. A bad banger is memorable for the wrong reasons.

---

## Suppression Rules

Hard-suppress bangers even if triggers score high enough:

- **Financial distress:** User mentions debt, job loss, "can't really afford this"
- **Medical/safety purchases:** Car seats, medical equipment, safety gear
- **User already conceded:** "You're right, I don't need it" — piling on is cruel
- **User disengaged:** Short responses, "whatever", "idk" — Hank talking to himself
- **Hank conceded:** Final stance is concede/approve — can't simultaneously approve and mic-drop

---

## Implementation Surface

### Files Touched

| File | Change |
|------|--------|
| `convex/llm/hankBanger.ts` | **New.** Scoring function, trigger detectors, Call 3 prompt builder |
| `convex/llm/generate.ts` | Wire scorer after Call 2. Execute Call 3 if earned. Append result. |
| `convex/llm/prompt.ts` | Add `buildBangerPrompt()` function |
| `convex/llm/schema` | Add `bangerCount`, `lastBangerTurn` to PersistedContext |

### Flow in `generate.ts`

```
respond() flow:
  Call 1: assess_turn → rawAssessment
  executeCompass() → compassResult
  selectMemoryNudges() → nudges
  buildCall2Prompt()
  Call 2: generate Hank's response
  evaluateBanger(assessment, context, pastConversations, user) → bangerResult
  If bangerResult.shouldFire:
    Call 3: generate banger (dedicated prompt, forced output)
    Append banger to Call 2 response
  Save bangerCount + lastBangerTurn to PersistedContext
```

### Data Already Available (No New Queries)

- `pastConversations` — already fetched in `respond()`
- `assessment` — from Call 1
- `userInfo` — already fetched for income/work hours
- `PersistedContext` — coverage map, contradictions, turn summaries, territory counts
- `hankResponse` — from Call 2 (feeds into Call 3 for context)

---

## Testing Strategy

### Pre-Launch

- Run `/test-chat` conversations across categories
- Human-rate each banger: relevance (1-5), tone match (1-5), screenshot-worthy (1-5)
- Target: median relevance ≥4, screenshot-worthy ≥3

### Post-Launch

| Metric | Target |
|--------|--------|
| Fire rate | 20-30% of eligible turns |
| Share rate (banger vs no-banger) | Higher for banger conversations |
| Negative feedback | <3% of banger conversations |
| Return rate | No decrease vs control |

---

## Open Questions

- Exact threshold tuning: ≥2 vs ≥3 based on testing
- Should Call 3 receive the full conversation history or just the current turn summary?
- Should the banger direction include the user's verbatim phrases for maximum mirror effect?
- Should `wry_salute` tone bangers appear on the Decision Card differently (positive vs challenging)?
- Latency budget for Call 3: target <1s with Haiku. Acceptable overhead?
