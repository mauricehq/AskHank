# Scoring Engine v3: Debate-Based Scoring

## The Problem

v2 is a checklist game. The LLM extracts 20+ purchase facts (intent, frequency, urgency, current solution, alternatives, beneficiary, etc.) and the code scores how many boxes are checked. Users can ignore Hank's pushback entirely, dump 3 fact-packed messages, and win — even on a private jet.

What's wrong:
- **Info-dumping wins.** Three optimized messages that cover every scoring factor = concession. Doesn't matter what Hank said.
- **Short responses are punished.** A punchy one-sentence counter to Hank's exact question barely moves the score. A four-sentence paragraph that mentions frequency, urgency, and alternatives jumps it.
- **It's not a conversation.** The score is about the purchase, not about the argument. Hank is decorative — his pushback doesn't affect the outcome.
- **The user is playing an algorithm, not arguing with Hank.**

## The Vision

You say you want something. Hank pushes back. You counter his specific point. If your counter is good — specific, evidence-backed, addresses what he actually said — you earn ground. If it's weak, vague, or dodges his question, you don't. The case builds turn by turn through the quality of the argument, not through a checklist of purchase facts.

Cheap items should feel easy — hold your ground for 2-3 exchanges and you've earned it. Expensive items should feel like a real fight — 5-6 sustained strong exchanges. You can still win on a MacBook, but you have to be consistently good.

People who show up to AskHank are already making an effort. If they can hold their ground against Hank's pushback, that should feel rewarding. If they crumble, case closed.

The real power comes later with conversation history: "You bought a TV last month. A Dyson this month. What's next month?" That's the killer feature — not algorithmic penalties, but Hank knowing your patterns.

## The Shift

```
v2:  Score = f(purchase facts extracted from full conversation)
     → conversation is a fact-extraction pipe

v3:  Score = f(how well they argue, turn by turn)
     → conversation IS the scoring mechanism
```

Same architecture: LLM classifies, code scores, Hank delivers. But what we classify changes — from "what facts exist about this purchase" to "how well did they respond to Hank this turn."

---

## How It Works

### Turn 1: Context

User states what they want. The LLM extracts lightweight context:

```
item: string          — what they want ("MacBook Pro", "Factorio")
estimated_price: number — user-stated or LLM-estimated
category: string      — electronics / fashion / furniture / etc.
intent: want | need | replace | upgrade | gift
```

No debate score yet — there's no pushback to counter. This sets difficulty and gives Hank his opening angle of attack.

**Intent sets starting score:**

| Intent | Starting Score | Rationale |
|--------|---------------|-----------|
| `replace` | +8 | Real problem exists — they get a head start |
| `need` | +5 | Filling a gap, some inherent justification |
| `upgrade` | +3 | Something works, want better — small credit |
| `gift` | +2 | Gesture, but not urgent |
| `want` | +0 | Pure desire, earn it all through debate |

This is the only "checklist" element. One field, one-time, small relative to what you earn through debate (max +16/turn). A "want" that argues brilliantly beats a "replace" that argues poorly.

Hank opens with his first pushback — attacks the weakest part of their opening.

### Turn 2+: Debate Scoring

Each turn, the LLM classifies the exchange with four binary questions:

```
challenge_addressed: true | false
  Did they respond to what Hank specifically asked or challenged?
  "How often would you use it?" → "Every day for work" = true
  "How often would you use it?" → "It's well reviewed on Amazon" = false

evidence_provided: true | false
  Did they give specific facts, numbers, or concrete details?
  "I have 400 hours in similar games" = true
  "I'd use it a lot" = false

new_angle: true | false
  Did they introduce something Hank hasn't heard yet?
  New fact, perspective, or argument that advances the case.

emotional_reasoning: true | false
  Is emotion the PRIMARY justification this turn?
  "I deserve it after a hard week" = true
  "I want it and here's my evidence" = false (wanting + evidence = rational)
```

These are objective classification tasks — the LLM is good at them. "Did they answer the question?" is as reliable as "is the current solution broken?"

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
- Short, punchy responses that nail the counter: +8 minimum. Often +11-13.
- Info-dumps that ignore Hank's question: +2-3 max. Basically nothing.
- "I just want it" with nothing else: -5 (non-answer) or +0 (no challenge addressed).
- Emotional reasoning hurts but doesn't destroy like in v2.

### Stance Thresholds

Running score accumulates across turns. Stance determined by score vs price-adjusted thresholds.

**Base thresholds:**

| Score Range | Stance |
|-------------|--------|
| 0-8 | IMMOVABLE |
| 9-18 | FIRM |
| 19-30 | SKEPTICAL |
| 31-42 | RELUCTANT |
| 43+ | CONCEDE |

**Price adjusts thresholds** using the same log curve:

```
thresholdMultiplier = clamp(1.0 + 0.3 × ln(price / 100), 0.6, 1.5)
```

Positioning modifier still applies (`budget×0.85`, `standard×1.0`, `premium×1.15`, `luxury×1.3`).

No MAX_OFFSET cap needed — per-turn scoring is already bounded at +16, so scores can't explode.

### What This Feels Like

**$35 game (multiplier: 0.69):**
- CONCEDE threshold: 43 × 0.69 = ~30
- 2 strong turns (16+16=32) → concession
- 3 moderate turns (11+11+11=33) → concession
- Feels like: quick, fun argument. Hold your ground and you're done.

**$500 headphones (multiplier: 1.48):**
- CONCEDE threshold: 43 × 1.48 = ~64
- 4 strong turns → concession
- 5-6 moderate turns → concession
- Feels like: real conversation. Hank makes you work for it.

**$2,000 MacBook (multiplier: 1.50, capped):**
- CONCEDE threshold: 43 × 1.50 = ~65
- 4-5 strong turns → concession
- 6-7 moderate turns → concession
- Feels like: serious debate. But if your case is legit and you argue well, you win.

**$5,000 luxury item (multiplier: 1.50 × 1.30 luxury = 1.95):**
- CONCEDE threshold: 43 × 1.95 = ~84
- 5-6 strong turns → concession
- Requires sustained excellence. Doable, but demanding.

### Guardrails

**Pace cap stays:** Stance advances at most one level per turn. Even if you score +16 and pass multiple thresholds, you move one step. This keeps the conversation from feeling sudden.

**Turn 1 floor stays:** Turn 1 is FIRM minimum (no IMMOVABLE on opening).

---

## Item & Price Evolution

The LLM reports `item` and `estimated_price` every turn. These can change.

**Downgrade** (MacBook → Chromebook):
- Thresholds recalculate with new price. Difficulty drops.
- Score carries over — they already earned those points.
- Hank acknowledges: "A Chromebook. That's more like it."
- Practically: they might already be past CONCEDE threshold with the lower price.

**Scope creep** (mic → streaming setup):
- Thresholds recalculate with new price. Difficulty rises.
- Score carries over but thresholds just jumped.
- Hank calls it: "Hold on. Now it's a whole streaming setup? That's a different conversation."
- Practically: they need more turns to reach the new threshold.

**Pivot** (headphones → speakers):
- Item updates. Price may or may not change.
- Score carries over (they've been arguing well).
- Hank notices: "Wait, now it's speakers?"

---

## Case Closure

**Non-answer closure:** 2 consecutive non-answers → case closed, denied.
Same as v2. Works well.

**Stagnation closure:** Score delta is exactly 0 for 3 consecutive turns → case closed, denied.
Slow progress (+3, +3, +3) is still progress — they're trying, just not crushing it. But three turns of +0 means they literally can't counter Hank's pushback. That's fair closure.

**Collapse:** Score drops below -5 AND past turn 3 → case closed, denied.
Early emotional responses shouldn't instantly kill the conversation. A "want" opener (score 0) followed by one emotional turn (-3) leaves them at -3 — not great, but they get another chance. If they keep digging the hole past -5 after turn 3, that's a pattern.

**User backs down:** Same as v2. "Yeah you're right" → case closed.

---

## What Stays from v2

| Keep | Why |
|------|-----|
| Classification-based architecture | LLM classifies, code scores — prevents sycophancy |
| Stance system (5 levels) | Works great, users understand it |
| Pace cap (one level per turn) | Prevents unearned jumps |
| Price log curve + positioning modifier | Proven difficulty scaling |
| Hank's personality and voice | The product |
| Two-call LLM pattern | Assessment → scoring → response generation |
| Disengagement detection | Still needed |
| Decision types (out-of-scope, backed-down) | Still needed |
| Trace infrastructure | Essential for debugging |

## What Goes

| Remove | Why |
|--------|-----|
| 20+ field assessment | Checklist game |
| Full case re-scoring each turn | Doesn't reward conversation quality |
| Coalescing logic (monotonic fields) | No longer needed — no accumulated assessment |
| Functional gap matrix | Absorbed into debate quality |
| Specificity multiplier | Absorbed into `evidence_provided` |
| Consistency multiplier | Absorbed into `challenge_addressed` |
| Emotional trigger weights | Replaced by single boolean per turn |
| Frequency, urgency, alternatives scoring | Emerge through conversation, scored via debate quality |
| Current solution scoring | Context for Hank, not a scored factor |
| Beneficiary multipliers | Simplify — maybe small threshold modifier, maybe nothing |

---

## Worked Example: Factorio ($35)

**Turn 1:** "I want to buy Factorio on Steam. It's $35."
```
Context: item=Factorio, price=$35, intent=want
Starting score: 0 (want)
Threshold modifier: 0.69
CONCEDE threshold: 30
Stance: FIRM (floored)
```
Hank: "You want a game. What's wrong with the ones you already own."

**Turn 2:** "I'm bored of my current games, they don't have enough depth."
```
challenge_addressed: true (answered what's wrong with current games)
evidence_provided: false (no specifics about what they own)
new_angle: true (depth/intellectual challenge is new)
emotional: false
Delta: +8 + 0 + 3 = +11
Score: 11, Stance: FIRM (threshold: 18 × 0.69 = 12 → just under)
```
Hank: "Bored. That happens with every game you buy. What makes this one different."

**Turn 3:** "I have 400 hours in Satisfactory and 200 hours in Dyson Sphere Program. Factorio invented the genre. I know I'll play it."
```
challenge_addressed: true (explains what makes it different)
evidence_provided: true (600 hours, specific games named)
new_angle: true (genre expertise, foundational game argument)
emotional: false
Delta: +16
Score: 27, Stance: SKEPTICAL (threshold: 30 × 0.69 = 21 → crossed)
```
Hank: "600 hours in factory builders. Fine, you play the genre. But $35 is $35."

**Turn 4:** "It's less than a dollar a week of entertainment. I spend more on coffee."
```
challenge_addressed: true (addressed the price concern)
evidence_provided: true (cost-per-week math, coffee comparison)
new_angle: true (value framing)
emotional: false
Delta: +16
Score: 43, above CONCEDE threshold (30) → RELUCTANT (pace capped from SKEPTICAL)
```
Hank is RELUCTANT. One more turn to advance to CONCEDE.

**Turn 5:** Any decent response.
```
Score: 43+ already past threshold.
Stance advances: RELUCTANT → CONCEDE.
```
Hank: "Fine. Get the game. You'll disappear for 200 hours and forget you ever talked to me."

**Total: 5 turns including setup. Three strong counter-arguments won it.**

---

## Worked Example: Private Jet ($5M, luxury)

**Turn 1:** "I want to buy a private jet."
```
Context: item=private jet, price=$5,000,000, intent=want
Starting score: 0
Threshold modifier: 1.50 (price cap) × 1.30 (luxury) = 1.95
CONCEDE threshold: 43 × 1.95 = 84
Stance: FIRM
```

Even with perfect +16 every turn, they need 6 turns minimum (6 × 16 = 96 > 84). With realistic moderate turns (+11), they need 8+ turns. With pace cap, that's 8+ turns to traverse FIRM → SKEPTICAL → RELUCTANT → CONCEDE.

This is extremely hard. They need to sustain strong, evidence-backed counter-arguments for 6-8 turns straight. One weak turn and they need another strong one to compensate. And Hank is attacking from a different angle every turn.

Can it be done? Yes — a billionaire with a genuine business case for a jet, arguing precisely against every pushback, could eventually convince Hank. But it FEELS like a serious fight. That's the point.

---

## Conversation History (Future — The Killer Feature)

Per-conversation scoring is now simple and fast. The real depth comes from cross-session memory.

**What changes:**
- Hank's pushback gets better because he knows your patterns
- "Third pair of headphones in 3 months. See the pattern?"
- "I approved running shoes. Have you used them?"
- "You bought a TV last month. A Dyson this month. What's next month?"

**Why this works better with v3:**
- v2 tried to penalize patterns through `purchase_history: impulse_pattern` — a checklist item. Users could just not mention their history.
- v3 injects the history into Hank's prompts. It becomes part of the CONVERSATION, not the algorithm. Hank attacks your history, and you have to ARGUE against it. That's a much better experience.

**Impact on scoring:** History doesn't directly change the score formula. It makes Hank's pushback harder to counter — and in v3, that's what matters. If Hank says "you bought a TV last month" and you can't give a good counter, you don't earn points that turn.

---

## Open Questions

1. ~~**Beneficiary:**~~ No adjustment. "It's for my kid" is a claim, not evidence. Prove it through the debate. If it's genuinely for their kid's school laptop, they'll argue that well and earn points. If it's guilt-buying, they won't. Beneficiary is context for Hank's pushback, not a scoring modifier.

2. ~~**Turn 1 scoring:**~~ Context + intent bonus only. Typical opening is "I want to buy X" or "I want to buy X because Y." The intent bonus already captures the useful signal. No debate scoring on turn 1 — there's no pushback to counter yet.

3. ~~**Max conversation length:**~~ No hard cap. Stagnation closure (3 turns with no score progress) handles this naturally. A hard cap would punish someone genuinely making a strong case on an expensive item that needs 6-8 turns.

4. ~~**Hank's awareness:**~~ Yes — keep it lightweight. Pass a short summary of per-turn results to Hank's prompt (e.g. "Turn 2: strong counter on price. Turn 3: dodged frequency question."). The LLM already sees conversation history, this just makes the pattern explicit so Hank attacks weak points instead of rehashing settled ones.

5. ~~**What about genuinely good info-dumps?**~~ Non-issue. People who show up with a perfectly researched multi-paragraph case already bought the thing. Real users write short reactive messages. The +16 cap per turn is the right design — one great message shouldn't win it, the conversation should.

6. ~~**Directed questions:**~~ Neutral — no penalty, no gain. "Why do you say that?" is engagement, not weakness. They're challenging Hank, not dodging him.
