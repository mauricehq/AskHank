# Hank's Scoring Engine (v2)

## What Changed (v1 → v2)

v1 had a math problem: 46% of category/price combinations could never reach CONCEDE. Any electronics item $50+, any car $50+, any fashion item $50+, any furniture $200+ — the threshold multiplier pushed the CONCEDE bar above the score cap of 100. The product's core promise is that a genuinely strong case can win. v1 broke that promise for nearly half of all purchases.

Three structural changes fix this:

1. **Logarithmic price scaling** replaces flat brackets. Smooth curve, no cliffs, better differentiation at high prices.
2. **Threshold caps** guarantee every stance is mathematically reachable. A perfect case can always reach CONCEDE.
3. **Category modifiers removed from thresholds.** Redundant with price scaling, LLM assessment, and the new luxury detection. They created unfair impossibility without adding detection quality.

One addition replaces category's role:

4. **Price positioning** (`budget`/`standard`/`premium`/`luxury`) captures what price alone can't — a $300 Chromebook vs a $2,000 MacBook Pro. Same category, very different justification bars.

---

## The Principle

The LLM classifies. The function scores. Hank delivers.

The LLM cannot be trusted to decide when to concede — it will fold under pressure (proven live when it caved on "I want it" in three words). The scoring engine is the guardrail that prevents sycophancy from killing the product.

**v0 asked the LLM to score factors on 0-10 scales.** Problem: LLMs are bad at numerical calibration. "I want a TV" gets `functional_gap: 0, specificity: 0.4` producing a score of ~2 (IMMOVABLE) before the user has said anything. The numbers were inconsistent across conversations and impossible to debug — what does `current_state: 4` even mean?

**v1 asked the LLM to classify facts.** Is the current solution broken, failing, or working? Is the intent want, need, or replace? The LLM picks from a menu. Our code maps those classifications to the same 0-10 scores deterministically via lookup tables. Same formula, same weights, same thresholds — just better inputs.

**v2 keeps the classification approach** but fixes the math that made concession impossible for common purchases, and adds price positioning so a premium $2,000 MacBook is harder to justify than a standard $300 Chromebook — without blanket-penalizing all electronics.

Why classification is better than numerical scoring:
- LLMs are good at "is this broken or working?" — bad at "rate this 3.7 out of 10"
- "broken" means broken every time. "7 out of 10" means whatever the LLM feels like.
- When a trace shows `intent: "want", current_solution: "unknown"`, you know exactly why the score is low. When it shows `functional_gap: 2`, you're guessing.
- Tuning is code changes, not prompt engineering. Change a number in a lookup table, redeploy, every conversation is affected consistently.

---

## The Pipeline

```
User message
    │
    ▼
1. Category Detection (LLM — tool call)
    ├── Out-of-scope? → Deflect with Hank one-liner. Done.
    │
    ▼
2. Extract Assessment (LLM — tool call)
    - Classify intent, current solution, frequency, urgency, etc.
    - Detect emotional triggers
    - Classify price positioning (budget/standard/premium/luxury)
    - Detect beneficiary (self/shared/dependent/gift)
    - Detect price range and purchase category
    │
    ▼
3. Map & Score (Function — no LLM)
    - Map classifications → numerical scores via lookup tables
    - Apply beneficiary multipliers to functional_gap and frequency
    - Weighted calculation
    - Apply specificity + consistency multipliers
    - Compute threshold multiplier (log price × positioning)
    - Apply threshold caps (MAX_OFFSET = 12)
    - Apply stance guardrails (floor + pace cap)
    │
    ▼
4. Stance (Function output)
    - IMMOVABLE / FIRM / SKEPTICAL / RELUCTANT / CONCEDE
    │
    ▼
5. Hank Responds (LLM, constrained by stance)
    - "Your stance is FIRM. Do not concede."
    │
    ▼
6. Disengagement / Stagnation Check
    - Two consecutive non-answers? → Case closure. Denied.
    - Four consecutive repeats with no new info? → Case closure. Denied.
    - Otherwise → Loop back to step 2.
```

**Step 1** is the gatekeeper — investments, real estate, medical, etc. get deflected before any scoring happens.
**Steps 2-5** are the conversation loop — classify, map, score, respond. The LLM returns its assessment via a structured tool call, guaranteeing valid JSON with validated enum values.
**Step 6** is the exit — disengagement, stagnation, or verdict.

The LLM does steps 1, 2, and 5. The function does steps 3 and 4. Clean separation — mouth vs spine.

---

## How It Works (Detail)

1. User says what they want to buy
2. Hank responds in character — pushes back, asks questions, cross-examines
3. After each user reply, the LLM reads the **full conversation** and classifies the case as it stands now
4. A Convex function (no LLM) maps classifications to numbers and computes the weighted verdict
5. The verdict tells the LLM what stance to take next
6. Hank delivers the stance in his voice

The LLM is good at "is their current solution broken or working?" — it's allowed to classify that. It's just never allowed to decide "should I give in?" — because it always will.

**The score doesn't carry over between turns.** Each turn, the LLM reads the entire conversation and produces a fresh assessment of the cumulative case. The conversation memory lives in the LLM's context window, not in the score. Turn 3 isn't scored in isolation — the LLM sees turns 1, 2, and 3 together and classifies the full picture. Scores naturally rise as users reveal more facts through arguing.

---

## The Assessment (What the LLM Extracts)

The LLM outputs a structured `assessment` object via tool call — no numbers, just classifications.

```json
{
  "assessment": {
    "item": "iPhone 15 Pro",
    "intent": "want",
    "current_solution": "unknown",
    "current_solution_detail": null,
    "alternatives_tried": "unknown",
    "alternatives_detail": null,
    "frequency": "unknown",
    "urgency": "none",
    "urgency_detail": null,
    "purchase_history": "unknown",
    "emotional_triggers": ["i_want_it"],
    "specificity": "vague",
    "consistency": "first_turn",
    "beneficiary": "self",
    "price_positioning": "standard"
  }
}
```

### Classification Fields

**Intent** — why do they want it?

| Value | Meaning |
|-------|---------|
| `want` | Pure desire, no functional reason |
| `need` | Filling a gap, they don't have one |
| `replace` | Current one is broken/failing |
| `upgrade` | Current one works but they want better |
| `gift` | Buying for someone else |

**Current Solution** — what's the state of what they have now?

| Value | Meaning |
|-------|---------|
| `broken` | Completely non-functional |
| `failing` | Works but has serious problems |
| `outdated` | Works but significantly behind |
| `working` | Works fine |
| `none` | They don't have one at all |
| `unknown` | Hasn't been discussed |

**Alternatives Tried** — have they explored other options?

| Value | Meaning |
|-------|---------|
| `exhausted` | Tried multiple alternatives, none worked |
| `some` | Tried a few things |
| `none` | Haven't tried anything else |
| `unknown` | Hasn't been discussed |

**Frequency** — how often would they use this?

| Value | Meaning |
|-------|---------|
| `daily` | Every day or nearly |
| `weekly` | A few times a week |
| `monthly` | A few times a month |
| `rarely` | Occasional use |
| `unknown` | Hasn't been discussed |

**Urgency** — is there a real deadline?

| Value | Meaning |
|-------|---------|
| `immediate` | Needs it now, real consequence for waiting |
| `soon` | Days/weeks, soft deadline |
| `none` | No time pressure |
| `unknown` | Hasn't been discussed |

**Purchase History** — revealed patterns?

| Value | Meaning |
|-------|---------|
| `impulse_pattern` | Admits to frequent impulse buying |
| `planned` | Has been researching/saving |
| `unknown` | No pattern revealed |

**Emotional Triggers** — array of detected emotional language:

`i_want_it`, `i_deserve_it`, `treat_myself`, `makes_me_happy`, `everyone_has_one`, `fomo`, `retail_therapy`, `bored`, `impulse`, `family_obligation`, `guilt`, `keeping_up_with_other_families`

Empty array = no emotional reasoning detected. Each trigger actively hurts the score.

**Specificity** — how detailed are their arguments?

| Value | Meaning |
|-------|---------|
| `vague` | Hand-waving, no details ("I want a TV") |
| `moderate` | Some details but gaps ("my phone is slow") |
| `specific` | Clear details ("crashes daily, need for work") |
| `evidence` | Facts with proof ("repair quoted $300, replacement $400") |

**Consistency** — how consistent across the conversation?

| Value | Meaning |
|-------|---------|
| `first_turn` | First or second message |
| `building` | Adding new facts that strengthen the case |
| `consistent` | Repeating but not contradicting |
| `contradicting` | Conflicts with earlier claims |

**Beneficiary** — who is the purchase for?

| Value | Meaning | Effect |
|-------|---------|--------|
| `self` | For themselves | Baseline — no adjustment |
| `shared` | Household/family use | Boosts functional_gap (×1.3) and frequency (×1.2) — shared items serve more people |
| `dependent` | For a child/elder/someone in their care | Strongest boost (functional_gap ×1.5, frequency ×1.3) — harder to deny care obligations |
| `gift_discretionary` | Gift with no obligation | Deflates scores (functional_gap ×0.5, frequency ×0.7) — "I want to buy them something nice" is want, not need |

The LLM classifies based on how the user frames it. "My kid needs a new backpack for school" → `dependent`. "I want to get my friend a birthday gift" → `gift_discretionary`. "We need a new couch for the living room" → `shared`.

**Price Positioning** — where does this item sit in its market?

| Value | Meaning | Threshold Multiplier |
|-------|---------|---------------------|
| `budget` | Bottom of market, value-oriented | ×0.85 |
| `standard` | Mid-range, typical choice | ×1.0 |
| `premium` | High-end but not top-tier | ×1.15 |
| `luxury` | Top-tier, aspirational | ×1.3 |

This captures what price alone can't. A $300 Chromebook is `standard` — reasonable for what it is. A $2,000 MacBook Pro is `premium` — high-end but functional, you're paying for better specs. A $3,000 Hermès bag is `luxury` — you're paying for the brand. Same price range, very different justification bars.

Classification guide for the LLM:
- **budget**: Store-brand, clearance, refurbished, deliberately cheapest option. Walmart basics, Amazon knockoffs, used/renewed.
- **standard**: Name-brand at typical price point, what most people buy. Nike running shoes, Samsung Galaxy, IKEA furniture, KitchenAid mixer.
- **premium**: High-end functional. You're paying for better specs, build quality, or features — not status. MacBook Pro, Sony WH-1000XM5, Herman Miller chair, Dyson vacuum.
- **luxury**: True luxury — the brand *is* the point. Rolex, Hermes, Louis Vuitton, Burberry, Bang & Olufsen, Porsche. You're paying for status, craftsmanship-as-identity, or exclusivity. If a reasonable alternative exists at 1/3 the price with 90% of the function, it's luxury.

The `_detail` fields (`current_solution_detail`, `alternatives_detail`, `urgency_detail`) capture evidence quotes for Hank to reference in responses. They don't affect scoring.

---

## The Mapping Tables (Classification → Score)

Our code maps each classification to the same 0-10 scale that `computeScore()` expects. No LLM judgment in this step — pure lookup.

### Functional Gap (Compound: Intent × Current Solution × Beneficiary)

This is the most important factor. It combines *why* they want it with *what they have now*, then adjusts for *who it's for*.

| Intent | Any current_solution |
|--------|---------------------|
| `replace` | `broken→9` `failing→7` `outdated→5` `none→6` `working→2` `unknown→6` |
| `need` | `broken→8` `failing→7` `outdated→6` `none→8` `working→4` `unknown→6` |
| `upgrade` | All → `2` |
| `want` | All → `0` |
| `gift` | All → `3` |

`replace + broken` is the strongest possible case (9). `want + anything` is zero — wanting isn't a gap.

After lookup, apply beneficiary multiplier:

| Beneficiary | Functional Gap Multiplier |
|-------------|--------------------------|
| `self` | ×1.0 |
| `shared` | ×1.3 |
| `dependent` | ×1.5 |
| `gift_discretionary` | ×0.5 |

### Single-Factor Maps

| Factor | Classification → Score |
|--------|----------------------|
| **Current State** | `broken→9` `failing→6` `outdated→3` `none→5` `working→0` `unknown→0` |
| **Alternatives** | `exhausted→9` `some→5` `none→1` `unknown→0` |
| **Frequency** | `daily→9` `weekly→6` `monthly→3` `rarely→1` `unknown→0` |
| **Urgency** | `immediate→9` `soon→5` `none→0` `unknown→0` |
| **Pattern History** | `impulse_pattern→1` `planned→7` `unknown→3` |

Frequency also gets a beneficiary multiplier:

| Beneficiary | Frequency Multiplier |
|-------------|---------------------|
| `self` | ×1.0 |
| `shared` | ×1.2 |
| `dependent` | ×1.3 |
| `gift_discretionary` | ×0.7 |

### Positioning Multiplier Map

Applied to the threshold multiplier (see Threshold Calculation below):

| Positioning | Multiplier |
|-------------|-----------|
| `budget` | ×0.85 |
| `standard` | ×1.0 |
| `premium` | ×1.15 |
| `luxury` | ×1.3 |

### Emotional Reasoning (Negative — Hurts Score)

Based on trigger count, not type:

| Triggers detected | Score |
|-------------------|-------|
| 0 | `0` |
| 1 | `-3` |
| 2 | `-5` |
| 3+ | `-8` |

More emotional arguments = harder to win. These don't just score zero — they pull the total down.

### Multipliers

| Factor | Classification → Multiplier |
|--------|----------------------------|
| **Specificity** | `vague→0.4` `moderate→0.8` `specific→1.2` `evidence→1.5` |
| **Consistency** | `building→1.2` `consistent→1.0` `contradicting→0.3` `first_turn→1.0` |

Vague arguments deflate everything. Contradictions are catastrophic — 0.3x on your entire score.

### Unknown = Zero (by Design)

Most fields default to `unknown` which maps to `0`. On turn 1, almost everything is unknown, so the score is naturally low. That's correct — they haven't argued yet. The score rises as they reveal facts through the conversation.

---

## The Weighted Calculation

```
score = (
  (functional_gap * 3.0) +
  (current_state * 3.0) +
  (alternatives * 3.0) +
  (frequency * 1.5) +
  (urgency * 1.5) +
  (pattern_history * 1.5) +
  (emotional * 2.0)
) * specificity * consistency
```

Result clamped to 0-100.

### Stance Floor (Turns 1-2)

Even with correct scoring, turn 1 naturally produces a very low score (most fields `unknown` → 0). That maps to IMMOVABLE — "no case whatsoever." But IMMOVABLE is the wrong *tone* for someone who just walked in. They haven't had a chance to argue.

**Rule:** On turns 1-2, IMMOVABLE is promoted to FIRM. The score stays honest (it's still low), but Hank's tone says "convince me" instead of "you have no case."

This only affects IMMOVABLE → FIRM. If scoring produces SKEPTICAL or higher on turn 1 (unlikely but possible), it passes through unchanged.

### Pace Cap

Stance can advance at most one level per turn. This prevents a single strong message from jumping IMMOVABLE straight to CONCEDE. The score is computed honestly, but the stance moves one step at a time. A user who drops a strong case on turn 2 might go FIRM → SKEPTICAL, then SKEPTICAL → RELUCTANT on turn 3.

### Base Verdict Thresholds

| Score Range | Hank's Stance | Behavior |
|-------------|--------------|----------|
| 0-30 | **Immovable** | "That's a want, not a need. Next." |
| 31-50 | **Firm** | Acknowledges one point, dismantles the rest |
| 51-70 | **Skeptical** | "You've got half a case. But..." — keeps pushing |
| 71-85 | **Reluctant** | "Sleep on it. If you still want it tomorrow, we'll talk." |
| 86-100 | **Concedes** | "Fine. Get the laptop. Yours is ancient." |

Most impulse purchases will land 0-30. That's by design. The app's default answer is no.

---

## Price Scaling (Logarithmic)

Price changes how hard Hank fights — not his personality, just the bar to clear. A $5 coffee doesn't get the same grilling as a $600 pair of headphones. But Hank still sounds like Hank at every tier.

### Formula

```
priceModifier = clamp(1.0 + 0.1 × ln(price / 100), 0.6, 1.5)
```

Anchor point: $100 = 1.0 (neutral). Below $100, thresholds drop (easier). Above $100, thresholds rise (harder). The natural logarithm ensures diminishing returns — the jump from $100 to $1,000 matters more than $1,000 to $10,000.

### Key Price Points

| Price | Modifier | Effect |
|-------|----------|--------|
| $10 | 0.77 | Light pushback |
| $25 | 0.86 | Below average scrutiny |
| $50 | 0.93 | Near baseline |
| $100 | 1.00 | Baseline — full Hank |
| $200 | 1.07 | Slightly elevated |
| $500 | 1.16 | Extra scrutiny |
| $1,000 | 1.23 | Serious purchase territory |
| $2,000 | 1.30 | Major purchase |
| $5,000 | 1.39 | Near maximum difficulty |
| $10,000 | 1.46 | Close to cap |
| $15,000+ | 1.50 | Cap — maximum difficulty |

### Why Logarithmic (v1 → v2)

v1 used 5 flat brackets ($15/$50/$200/$500/∞) mapping to 0.6/0.8/1.0/1.2/1.4. Problems:
- **Cliff effects**: $49 = 0.8, $51 = 1.0. A $2 difference shouldn't change Hank's behavior.
- **No differentiation at the top**: $600 and $6,000 both got 1.4. A $600 keyboard and a $6,000 watch deserve very different bars.
- **Combined with category modifiers, blew past the cap**: $500+ (1.4) × electronics (1.3) = 1.82 threshold multiplier. CONCEDE at 86 × 1.82 = 156. Impossible on a 100-point scale.

The log curve fixes all three: smooth transitions, high-end differentiation, and bounded output.

---

## Threshold Calculation

The threshold multiplier adjusts how high the score bar is for each stance level.

### Computing the Multiplier

```
thresholdMultiplier = priceModifier × positioningModifier
```

That's it. Two factors, both bounded.

**v1 also included category modifiers here.** v2 removes them. See "Why Category Modifiers Were Removed" below.

### Applying the Multiplier (with Caps)

```
adjustedThreshold = min(baseThreshold × multiplier, baseThreshold + MAX_OFFSET)
```

`MAX_OFFSET = 12`. This caps how far any threshold can be pushed above its base value, regardless of multiplier.

### Per-Stance Maximum Thresholds

| Stance | Base Threshold | Max Adjusted (base + 12) |
|--------|---------------|--------------------------|
| IMMOVABLE | 30 | 42 |
| FIRM | 50 | 62 |
| SKEPTICAL | 70 | 82 |
| RELUCTANT | 85 | 97 |

A score of 98+ always reaches CONCEDE. A score of 83+ always reaches at least RELUCTANT. This is the core guarantee: **a perfect case always wins.**

### Why Threshold Caps (v1 → v2)

v1 had no caps. The adjusted threshold was simply `baseThreshold × multiplier`. With high multipliers, this produced thresholds above 100:

- Cars $500+: 86 × (1.4 × 1.5) = 86 × 2.1 = **180** → impossible
- Electronics $200+: 86 × (1.2 × 1.3) = 86 × 1.56 = **134** → impossible
- Fashion $50+: 86 × (1.0 × 1.2) = 86 × 1.2 = **103** → impossible

The cap mechanism preserves difficulty scaling (expensive luxury items are still the hardest) while guaranteeing reachability (they're hard, not impossible).

---

## Why Category Modifiers Were Removed from Thresholds

v1 applied category multipliers (cars 1.5, electronics 1.3, fashion 1.2, etc.) to the threshold calculation. v2 removes them entirely from the math.

**They're still in the system** — the LLM knows the category for prompting, conversation memory, and analytics. Category just doesn't affect the numerical threshold anymore.

### Why They're Redundant

1. **The LLM's assessment already captures category-relevant signals.** A phone upgrade gets `intent: "upgrade"` (functional_gap = 2) and the LLM naturally scrutinizes tech spec-bump arguments. A fashion purchase where they own 8 jackets gets `alternatives_tried: "none"` because they haven't exhausted what they own. The classification system handles category-specific skepticism through the actual facts of the case.

2. **Price scaling already differentiates.** A $200 jacket (modifier 1.07) and a $2,000 jacket (modifier 1.30) face proportionally different bars. Adding a flat 1.2 category multiplier on top was double-counting.

3. **Price positioning replaces the category signal.** The real distinction isn't "electronics vs fashion" — it's "budget vs luxury within any category." A $300 Chromebook and a $2,000 MacBook Pro are both electronics, but need very different justification bars. Price positioning captures this precisely.

4. **Category modifiers created unfair impossibility.** The stacking of price brackets × category multipliers was the primary cause of the 46% unreachable problem. Removing them (along with adding caps) restores fairness.

---

## Reachability Analysis

With v2's log pricing + positioning + threshold caps, every combination can reach CONCEDE.

### Worst Case: Expensive Luxury Item

A $10,000 luxury item (the hardest possible case):
- priceModifier: 1.46
- positioningModifier: 1.30
- thresholdMultiplier: 1.46 × 1.30 = 1.90
- RELUCTANT threshold: min(85 × 1.90, 97) = **97** (capped)
- CONCEDE threshold: score > 97 → needs **98+**

A score of 98 requires near-perfect classifications across all factors with high multipliers. Extremely difficult, but mathematically achievable. A broken essential with exhausted alternatives, daily use, immediate urgency, planned purchase, no emotional triggers, evidence-level specificity, and building consistency would score well above 98.

### Best Case: Cheap Budget Item

A $10 budget item (the easiest possible case):
- priceModifier: 0.77
- positioningModifier: 0.85
- thresholdMultiplier: 0.77 × 0.85 = 0.65
- RELUCTANT threshold: min(85 × 0.65, 97) = **55**
- CONCEDE threshold: score > 55

Even a moderate case clears this bar. A $5 coffee with a basic justification sails through.

### Coverage

| Price | Positioning | Multiplier | CONCEDE Threshold | Reachable? |
|-------|------------|------------|-------------------|------------|
| $10 | budget | 0.65 | 56 | Yes — easily |
| $50 | standard | 0.93 | 80 | Yes — moderate case |
| $200 | standard | 1.07 | 91 | Yes — strong case |
| $500 | premium | 1.34 | 97 (capped) | Yes — very strong case |
| $1,000 | premium | 1.41 | 97 (capped) | Yes — very strong case |
| $2,000 | premium | 1.50 | 97 (capped) | Yes — very strong case |
| $2,000 | luxury | 1.69 | 97 (capped) | Yes — near-perfect case |
| $5,000 | luxury | 1.81 | 97 (capped) | Yes — near-perfect case |
| $10,000 | luxury | 1.90 | 97 (capped) | Yes — near-perfect case |

**100% of combinations are reachable.** The cap ensures the maximum CONCEDE threshold is always 97, which is achievable with a genuinely excellent case.

---

## Worked Examples

### Example 1: Impulse TV Purchase

**Turn 1:** "I want to buy a TV"

```
Assessment: intent=want, current_solution=unknown, specificity=vague,
            emotional_triggers=[i_want_it], consistency=first_turn,
            beneficiary=self, price_positioning=standard

Mapped:     functional_gap=0 (×1.0 beneficiary), current_state=0,
            alternatives=0, frequency=0 (×1.0 beneficiary),
            urgency=0, pattern_history=3, emotional=-3,
            specificity=0.4, consistency=1.0

Calculation: (0+0+0)*3.0 + (0+0+3)*1.5 + (-3)*2.0 = -1.5
             -1.5 * 0.4 * 1.0 = -0.6 → clamped to 0

Score: 0 → IMMOVABLE → stance floor → FIRM

Hank challenges but gives them a chance to argue.
```

### Example 2: Broken TV Replacement

**Turn 2:** "My current TV broke last week, I watch it every day"

```
Assessment: intent=replace, current_solution=broken, frequency=daily,
            specificity=specific, consistency=building,
            beneficiary=self, price_positioning=standard

Mapped:     functional_gap=9 (×1.0), current_state=9, alternatives=0,
            frequency=9 (×1.0), urgency=0, pattern_history=3,
            emotional=0, specificity=1.2, consistency=1.2

Calculation: (9+9+0)*3.0 + (9+0+3)*1.5 + 0*2.0 = 72
             72 * 1.2 * 1.2 = 103.68 → clamped to 100

Price: ~$500 TV, standard positioning
  priceModifier = 1.0 + 0.1 × ln(500/100) = 1.0 + 0.1 × 1.61 = 1.16
  positioningModifier = 1.0
  thresholdMultiplier = 1.16

Thresholds: SKEPTICAL = min(70 × 1.16, 82) = 81
            RELUCTANT = min(85 × 1.16, 97) = 97 (capped)

Score 100 > 97 → CONCEDE (but pace cap: max one level per turn)
Previous stance: FIRM → advances to SKEPTICAL

Hank: "Okay, a broken TV with daily use — you've got half a case."
```

### Example 3: Premium MacBook Pro

**Turn 3 of a conversation:** "My 2019 MacBook is dying — battery swelling, quoted $300 for repair. I use it 8 hours a day for work. I've been researching for two months."

```
Assessment: intent=replace, current_solution=failing,
            frequency=daily, urgency=soon, alternatives_tried=some,
            purchase_history=planned, specificity=evidence,
            consistency=building, beneficiary=self,
            price_positioning=premium

Mapped:     functional_gap=7, current_state=6, alternatives=5,
            frequency=9, urgency=5, pattern_history=7,
            emotional=0, specificity=1.5, consistency=1.2

Calculation: (7+6+5)*3.0 + (9+5+7)*1.5 + 0*2.0 = 54 + 31.5 = 85.5
             85.5 * 1.5 * 1.2 = 153.9 → clamped to 100

Price: $2,000, premium positioning
  priceModifier = 1.0 + 0.1 × ln(2000/100) = 1.0 + 0.1 × 3.0 = 1.30
  positioningModifier = 1.15
  thresholdMultiplier = 1.30 × 1.15 = 1.50

Thresholds: RELUCTANT = min(85 × 1.50, 97) = 97 (capped)

Score 100 > 97 → CONCEDE (pace cap may apply depending on previous stance)

Hard but achievable. A failing daily-use work tool with evidence and research clears
the premium bar.
```

### Example 4: Kid's Winter Coat (Dependent)

"My daughter's winter coat is too small, she needs a new one for school."

```
Assessment: intent=need, current_solution=failing, frequency=daily,
            urgency=immediate, beneficiary=dependent,
            specificity=specific, consistency=first_turn,
            price_positioning=standard

Mapped:     functional_gap=7 × 1.5 (dependent) = 10.5, current_state=6,
            alternatives=0, frequency=9 × 1.3 (dependent) = 11.7,
            urgency=9, pattern_history=3, emotional=0,
            specificity=1.2, consistency=1.0

Calculation: (10.5+6+0)*3.0 + (11.7+9+3)*1.5 + 0 = 49.5 + 35.55 = 85.05
             85.05 * 1.2 * 1.0 = 102.06 → clamped to 100

Price: $80 coat, standard positioning
  priceModifier = 1.0 + 0.1 × ln(80/100) = 1.0 + 0.1 × (-0.22) = 0.98
  positioningModifier = 1.0
  thresholdMultiplier = 0.98

Thresholds: RELUCTANT = min(85 × 0.98, 97) = 83
Score 100 > 85 (CONCEDE base × 0.98 = 84) → CONCEDE

Dependent + genuine need + standard price = relatively easy approval. Hank's not a monster.
```

---

## Out-of-Scope Categories

Some things Hank doesn't touch. No scoring, no cross-examination, just a clean deflection.

| Category | Hank's Response |
|----------|----------------|
| **Investments / Stocks** | "I handle purchases, not investments. Talk to a financial advisor. But if you're asking me, that means part of you knows this is impulse." |
| **Real Estate** | "I argue about headphones, not houses. That's above my pay grade." |
| **Gambling** | Same deflection. Hank is not a financial advisor. |
| **Medical** | "I'm not a doctor. If you need it for your health, get it." |
| **Vet / Pet Medical** | "I'm not arguing with someone about their sick dog. Go to the vet." |
| **Insurance** | "You're asking me if you should buy insurance. The answer is always yes. Next." |
| **Education** | "I don't get between people and learning. If you want the course, take it." |
| **Donations / Charity** | "You want to give money away? That's the opposite of my problem with you. Go." |
| **Legal Services** | "You need a lawyer, not me. Go handle your business." |

**Why:** Legal liability, moral liability, or both. Hank's lane is consumer purchases — the headphones, the jackets, the espresso machines, the cars. Things people buy on impulse and regret later. He doesn't touch financial products, health decisions, education, or generosity. One bad screenshot in any of these categories and the app is done.

**What IS fair game even if it sounds adjacent:**
- Kids' toys, clothes, gear — "Your kid has 30 stuffed animals. They don't need number 31."
- Pet accessories — "Your dog doesn't need a $200 raincoat."
- Online subscriptions — "You have 7 streaming services. Pick 3."
- Hobby equipment upgrades — "Your guitar is fine. You don't practice enough to justify a $2,000 upgrade."

The deflections still sound like Hank — dry, pointed, in character. He doesn't help with out-of-scope categories, but he doesn't break character either.

---

## Why This Is Hard to Game

1. **One strong factor isn't enough.** "It's broken" scores current state but if you own 5 alternatives and use it once a year, you're still denied.

2. **Emotional arguments actively hurt you.** You can't pad your score with "I really want it." It makes things worse. Each trigger detected pulls the score down.

3. **Consistency is a multiplier, not a factor.** One contradiction doesn't just lose you points on one axis — it deflates your entire score to 0.3x.

4. **Specificity is invisible.** Users don't know vague answers are hurting them. `vague` gives a 0.4x multiplier — less than half credit on everything.

5. **Pattern history compounds.** Gaming works once. By the third time you claim something is broken, Hank's suspicion is through the roof.

6. **Cross-examination is unpredictable.** Hank attacks from whichever factor is weakest. Users can't prepare because they don't know which angle is coming next.

7. **Memory is the ultimate guard.** You can't repeat the same strategy across conversations. Hank remembers everything.

8. **Classifications are transparent to us, opaque to users.** We can see exactly why the score is what it is. Users just experience Hank being hard to convince.

---

## What Hank Attacks First

Hank doesn't ask all questions every time. He leads with the weakest factor — the one most likely to collapse the case.

- User says "I need new headphones" → Hank checks alternatives first ("Don't you already own a pair?")
- User says "My shoes are worn out" → Hank checks frequency ("When's the last time you wore them?")
- User asked about headphones last week → Hank leads with pattern ("Again?")
- User opens with "I really want..." → Hank immediately flags emotional reasoning

The LLM picks the attack angle. The function decides the verdict. Different roles.

---

## Concession Design

When Hank concedes, it has to feel earned. Not "okay fine." More like:

- "I've been grilling you for 5 messages and your story hasn't changed. Your laptop is genuinely dying. Get the new one."
- "You've got a real gap here. No winter coat in December is a problem. Go."
- "I don't love it, but you've been saving for six months and you can actually justify this. Fine."

The concession acknowledges the fight. It respects the effort. It proves the system is fair — not rigged to always say no.

This is the TikTok moment. The screenshot. The thing people share. "I FINALLY got Hank to say yes."

---

## The Conversation Flow

**Exchange 1:** User states what they want. Hank says no and attacks the weakest factor.
**Exchange 2-3:** User defends. Hank cross-examines on a different factor each time.
**Exchange 4-5:** If score is rising, Hank gets more specific in pushback. If score is flat, Hank closes it down.
**Final:** Function computes verdict. Hank delivers it in character.

Typical conversation: 3-5 exchanges. Most end in denial. The rare concession is memorable.

---

## Disengagement & Case Closure

The most common interaction won't be a heated debate. It'll be someone who wants permission, doesn't get it, and stops trying. "I want it." "Yes." "Because." One-word non-answers.

The scoring engine handles the verdict naturally — low specificity multiplier crushes the score, emotional reasoning stacks negative weight, the case never gets close to approval. But the **conversation** still needs a clean exit. Hank asking a fourth probing question to someone giving one-word answers is just annoying.

### Disengagement Rule

**Two consecutive non-answers → Hank closes the case.**

A non-answer is:
- One-word replies with no substance ("Yes", "Because", "Whatever")
- Restating "I want it" without new information
- Ignoring the question entirely
- Getting assertive without arguing ("Just tell me it's okay")

### Stagnation Rule

**Four consecutive repeats with no new information → Hank closes the case.**

The LLM flags `has_new_information: false` when the user restates the same argument without adding substance. Escalating warnings at each stage:
1. "You said that already. Got anything new?"
2. "We've been going in circles."
3. "Last shot — give me something new or we're done."
4. Case closure.

### Case Closure (Denied)

Hank doesn't say "conversation over." He delivers a closing line — in character, memorable, screenshot-worthy.

**Examples:**
- "You came to me with 'I want it' and you're leaving with 'I want it.' Nothing changed. Case closed."
- "I asked three questions. You answered none of them. That tells me everything."
- "'Because' isn't a reason. It's what my kid says. No."
- "You don't need my permission. But you came here because you know the answer. It's no."
- "I gave you three chances to make a case. You gave me three non-answers. We're done."

### What Happens After Case Closure

- Conversation marked as **denied** in history
- "Saved $X" counter ticks up by the item's estimated price
- User can start a new conversation about the same item (but pattern history now works against them — "We talked about this yesterday. You had no case then either.")

### Why This Matters

Short denials are probably the most common conversation in the app. And they might be the best content:
- 3 exchanges, done in 15 seconds
- Hank's closing line is the punchline
- Easy to screen record for TikTok
- "I tried to convince Hank and he shut me down in 3 messages"

The quick denial is not a failure mode. It's the core experience for most users. The long earned concession is the rare highlight reel. Both are shareable.

---

## Implementation

- **LLM extracts assessment** as structured JSON via tool call — classifications, not numbers — alongside Hank's conversational response
- **Convex function** maps classifications to scores via lookup tables, computes weighted total, applies stance guardrails, returns stance
- **Stance feeds back** into the next LLM call as context: "Your stance is FIRM. Do not concede."
- **Conversation history** stored in Convex, fed as context for pattern detection
- **Past conversations** summarized and injected for cross-session memory

The LLM prompt explicitly says: "You do not decide when to concede. You will be told your stance. Follow it."

### Key Files

| File | Role |
|------|------|
| `convex/llm/scoring.ts` | Assessment types, mapping tables, `mapAssessmentToScores()`, `computeScore()`, `applyStanceGuardrails()` |
| `convex/llm/prompt.ts` | System prompt with classification extraction guidelines |
| `convex/llm/generate.ts` | Orchestrates: LLM call → parse assessment → map → score → save |
| `src/components/admin/TraceDetail.tsx` | Admin trace viewer (shows Assessment + Mapped Scores + Scoring Result) |

### Trace Data (Admin Debugging)

Traces store three layers for each turn:
- **Assessment** — the raw LLM classifications (`intent: "want"`, `current_solution: "broken"`, `price_positioning: "luxury"`, `beneficiary: "self"`, etc.)
- **Mapped Scores** — the deterministic output of the lookup tables (`functional_gap: 9`, `current_state: 9`, etc.)
- **Scoring Result** — the final computation (`score: 86`, `stance: "RELUCTANT"`, `thresholdMultiplier: 1.69`, `priceModifier: 1.30`, `positioningModifier: 1.30`)

When a stance guardrail is applied, the trace `decisionType` shows `"normal (stance floored)"` or `"normal (pace capped)"`.

---

## Hank's Memory (Keeping Receipts)

Memory is what makes Hank feel real. Not a chatbot, not a fresh session every time — a friend who pays attention and never forgets what you said.

### What Hank Remembers

For each past conversation, Hank retains:
- **What they wanted to buy** — item name, category, price
- **What they said to justify it** — their exact arguments and claims
- **The verdict** — denied or approved
- **Key quotes** — the strongest thing the user said ("it'll change my life", "I'll use it every day")

### How Hank Uses It

**Throwing your words back at you:**
- "Last month you convinced me the $120 chef knife would 'change your life.' Did it? Or is it in the drawer?"
- "You said you'd use the yoga mat every day. How's that going?"

**Pattern detection across conversations:**
- "This is the third pair of headphones you've asked about. You don't need headphones. You need to stop watching tech reviews."
- "You asked about an espresso machine in January. And February. It's March. Still no."

**Calling out repeat categories:**
- "Another jacket? You own eight. What's number nine going to do that one through eight didn't?"
- "You've spent $400 on kitchen gadgets this quarter. Your cooking hasn't improved."

**Using approved purchases against you:**
- "I let you buy running shoes last month. Have you run? Because now you want a fitness watch and I'm starting to see a pattern."
- "I approved the chef knife. That was your kitchen upgrade. Now you want a blender, a food processor, and a stand mixer. No. You got your one thing."

### Why This Is the Core Feature

1. **It kills gaming.** You can't reuse the same excuse. Hank remembers what worked and what didn't.
2. **It builds a relationship.** The app knows you. Your patterns, your weaknesses, your excuses. That's personal.
3. **It makes pushback specific.** Generic "you don't need this" is boring. "You said the same thing about the air fryer" is devastating.
4. **It drives retention.** Users build history with Hank. Leaving means losing that context. Starting over with a fresh bot is worse.
5. **It creates the best content.** "Hank remembered what I said 3 months ago" is a TikTok. "AI said no" is not.

### Implementation

- Each conversation already stores in Convex: item, messages, scores, verdict, amount, date
- When a conversation closes, the scoring engine generates a one-line summary — pre-computed, not on-the-fly
- Before each new conversation, query the last 20-30 summaries for the user
- Inject as structured YAML into the system prompt (lesson from Hopshelf — YAML parses cleaner than JSON for LLM context)
- ~30-40 tokens per summary. 30 conversations = ~1,000 tokens. Cheap.

**Summary format (YAML in system prompt):**
```yaml
history:
  - date: 2026-02-12
    item: Espresso machine
    price: 299
    verdict: denied
    claim: Coffee maker is broken
    quote: "I drink coffee every day"
  - date: 2026-02-28
    item: Running shoes
    price: 130
    verdict: approved
    claim: Old pair had holes, sole coming off
    quote: null
  - date: 2026-03-03
    item: AirPods Max
    price: 549
    verdict: denied
    claim: None — repeated "I want it"
    quote: "I want it" (x3)
  - date: 2026-03-05
    item: Winter jacket
    price: 89
    verdict: denied
    claim: Wanted a new style
    quote: null
    context: User owns 8 jackets
```

The LLM does the connecting — it spots patterns, references past quotes, and calls out repeat behavior. The structured YAML makes it easy to parse without hallucinating details.

### The Follow-Up Question

After an approved purchase, Hank can follow up in the next conversation:
- "By the way — did you actually buy those running shoes I approved? And are you using them?"
- If the user says no: "So I approved it and you didn't even buy it. Good. Your impulse passed."
- If the user says yes but isn't using it: "Great. So you wasted the money. Remember that next time you tell me you'll 'use it every day.'"

This closes the loop. Hank doesn't just evaluate purchases — he tracks outcomes. That makes every future conversation harder to game, because your track record follows you.

---

## User Dossier (What Hank Knows About You)

Conversation history is what happened. The dossier is what Hank **learned**. It's a living profile that builds itself over time — no forms, no onboarding, no setup. You just talk to Hank and he starts knowing you.

### What Goes in the Dossier

**Items owned** — extracted from conversations. What they have, how old, what condition.
**Life context** — things they mention naturally. Kids, partner, job type, commute, hobbies.
**Weaknesses** — categories they impulse-buy most. Detected from patterns.
**Track record** — approval rate, follow-through on approved purchases.

### Dossier Format (YAML in system prompt)

```yaml
dossier:
  owns:
    - item: MacBook Pro 2019
      condition: "battery swelling, quoted $300 repair"
      mentioned: 2026-03-01
    - item: Sony WH-1000XM4
      condition: working
      mentioned: 2026-03-03
    - item: Winter jackets (8)
      mentioned: 2026-03-05
    - item: 2018 Honda Civic
      mileage: ~60K
      mentioned: 2026-02-20
    - item: Chef knife ($120)
      status: approved purchase
      mentioned: 2026-02-15
  context:
    has_kids: true
    partner: wife
    coffee: daily
    commute: bus
    hobby: cooking
  weaknesses:
    - headphones (asked 3x in 2 months)
    - kitchen gadgets (4 asks this quarter)
  track_record:
    total_conversations: 14
    denied: 11
    approved: 3
    followed_through: 2 of 3
```

### How Hank Uses the Dossier

**Alternatives scoring with real data:**
- User wants new headphones → Hank doesn't guess, he knows: "You own Sony WH-1000XM4s. They work fine. You told me so yourself on March 3rd."

**Surgical pushback:**
- "Your Civic has 60K miles. That's nothing. Come back at 200K."
- "You take the bus to work. Why do you need a car upgrade?"

**Connecting dots the user didn't expect:**
- "You bought a chef knife last month and now you want a blender. You're not becoming a chef. You're becoming a kitchen gadget collector."

**Track record as leverage:**
- "I've approved 3 things for you. You followed through on 2. That 33% waste rate means I'm being too generous, not too strict."

### How It Builds

- After each conversation, the LLM extracts any new facts from the exchange
- A Convex function merges new facts into the existing dossier
- Old facts get updated, not duplicated — "MacBook Pro 2019" doesn't appear twice, the condition field gets updated
- Items mentioned as owned get added. Life details get added. Categories get tracked.
- The user never fills out a profile. They just talk to Hank.

### Why This Is the Retention Moat

1. **It builds itself.** No onboarding, no forms. Every conversation makes Hank sharper.
2. **It's invisible.** Users don't know the dossier exists until Hank references something they said weeks ago. That moment is magic.
3. **It can't be replicated by switching apps.** Hank after 50 conversations knows you better than any fresh AI. Starting over is starting from zero.
4. **It makes the scoring engine smarter.** Alternatives owned isn't a guess anymore — it's a fact from the dossier.
5. **It's cheap.** The dossier stays under ~500 tokens even after months of use. Combined with conversation summaries (~1,000 tokens), total memory context is ~1,500 tokens.

### System Prompt Structure

```
1. Hank's personality and rules (static)          ~500 tokens
2. User dossier (YAML, builds over time)           ~500 tokens
3. Conversation summaries (YAML, last 20-30)     ~1,000 tokens
4. Current stance from scoring engine                ~20 tokens
5. Current conversation messages                   variable
                                            ─────────────────
Total memory overhead:                           ~2,000 tokens
```

Cheap. Fits easily. Gets more valuable every conversation.

---

## Tuning

The mapping table values are hypothetical and need testing with real conversations. The v2 scoring engine has the following tunable knobs:

### Score Weights
- Heavy factor weight (functional_gap, current_state, alternatives): `3.0`
- Medium factor weight (frequency, urgency, pattern_history): `1.5`
- Negative factor weight (emotional_reasoning): `2.0`

### Multiplier Tables
- Specificity multipliers: `vague→0.4` `moderate→0.8` `specific→1.2` `evidence→1.5`
- Consistency multipliers: `building→1.2` `consistent→1.0` `contradicting→0.3` `first_turn→1.0`

### Beneficiary Multipliers
- Functional gap: `self→1.0` `shared→1.3` `dependent→1.5` `gift_discretionary→0.5`
- Frequency: `self→1.0` `shared→1.2` `dependent→1.3` `gift_discretionary→0.7`

### Price Scaling
- Log scale anchor: `100` (price at which modifier = 1.0)
- Log scale factor: `0.1` (how fast the curve rises)
- Clamp bounds: `[0.6, 1.5]`
- Formula: `clamp(1.0 + 0.1 × ln(price / 100), 0.6, 1.5)`

### Price Positioning Multipliers
- `budget→0.85` `standard→1.0` `premium→1.15` `luxury→1.3`

### Threshold Caps
- `MAX_OFFSET = 12` (maximum points added to any base threshold)
- Per-stance caps: IMMOVABLE 42, FIRM 62, SKEPTICAL 82, RELUCTANT 97

### Base Thresholds
- IMMOVABLE: 0-30, FIRM: 31-50, SKEPTICAL: 51-70, RELUCTANT: 71-85, CONCEDE: 86+

### Stance Guardrails
- Stance floor: turns 1-2, IMMOVABLE → FIRM
- Pace cap: max one stance level advance per turn

### What to Watch

- Is the concession rate around 10-15%? (Too high = too easy, too low = feels rigged)
- Are concessions going to genuinely justified purchases?
- Are users finding obvious gaming strategies?
- Does the conversation feel varied or repetitive?
- Are stance jumps between turns too volatile?
- Are luxury items appropriately harder but not impossible?
- Are dependent/shared purchases getting fair treatment?
- Is the log price curve differentiating well at the high end?

The mapping tables are knobs. Change a number, redeploy, every conversation is affected consistently. That's the advantage of deterministic scoring over LLM calibration — tuning is predictable.
