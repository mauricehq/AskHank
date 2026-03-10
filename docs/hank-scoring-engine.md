# Hank's Scoring Engine (v1)

## The Principle

The LLM classifies. The function scores. Hank delivers.

The LLM cannot be trusted to decide when to concede — it will fold under pressure (proven live when it caved on "I want it" in three words). The scoring engine is the guardrail that prevents sycophancy from killing the product.

**v0 asked the LLM to score factors on 0-10 scales.** Problem: LLMs are bad at numerical calibration. "I want a TV" gets `functional_gap: 0, specificity: 0.4` producing a score of ~2 (IMMOVABLE) before the user has said anything. The numbers were inconsistent across conversations and impossible to debug — what does `current_state: 4` even mean?

**v1 asks the LLM to classify facts.** Is the current solution broken, failing, or working? Is the intent want, need, or replace? The LLM picks from a menu. Our code maps those classifications to the same 0-10 scores deterministically via lookup tables. Same formula, same weights, same thresholds — just better inputs.

Why this is better:
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
1. Category Detection (LLM)
    ├── Out-of-scope? → Deflect with Hank one-liner. Done.
    │
    ▼
2. Extract Assessment (LLM)
    - Classify intent, current solution, frequency, urgency, etc.
    - Detect emotional triggers
    - Detect price range and purchase category
    │
    ▼
3. Map & Score (Function — no LLM)
    - Map classifications → numerical scores via lookup tables
    - Weighted calculation
    - Apply price tier modifier
    - Apply category modifier
    - Apply specificity + consistency multipliers
    - Apply stance floor (turns 1-2)
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
**Steps 2-5** are the conversation loop — classify, map, score, respond.
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

The LLM outputs a structured `assessment` object — no numbers, just classifications.

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
    "consistency": "first_turn"
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

`i_want_it`, `i_deserve_it`, `treat_myself`, `makes_me_happy`, `everyone_has_one`, `fomo`, `retail_therapy`, `bored`, `impulse`

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

The `_detail` fields (`current_solution_detail`, `alternatives_detail`, `urgency_detail`) capture evidence quotes for Hank to reference in responses. They don't affect scoring.

---

## The Mapping Tables (Classification → Score)

Our code maps each classification to the same 0-10 scale that `computeScore()` expects. No LLM judgment in this step — pure lookup.

### Functional Gap (Compound: Intent × Current Solution)

This is the most important factor. It combines *why* they want it with *what they have now*.

| Intent | Any current_solution |
|--------|---------------------|
| `replace` | `broken→9` `failing→7` `outdated→5` `none→6` `working→2` `unknown→6` |
| `need` | `broken→8` `failing→7` `outdated→6` `none→8` `working→4` `unknown→6` |
| `upgrade` | All → `2` |
| `want` | All → `0` |
| `gift` | All → `3` |

`replace + broken` is the strongest possible case (9). `want + anything` is zero — wanting isn't a gap.

### Single-Factor Maps

| Factor | Classification → Score |
|--------|----------------------|
| **Current State** | `broken→9` `failing→6` `outdated→3` `none→5` `working→0` `unknown→0` |
| **Alternatives** | `exhausted→9` `some→5` `none→1` `unknown→0` |
| **Frequency** | `daily→9` `weekly→6` `monthly→3` `rarely→1` `unknown→0` |
| **Urgency** | `immediate→9` `soon→5` `none→0` `unknown→0` |
| **Pattern History** | `impulse_pattern→1` `planned→7` `unknown→3` |

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

Same formula as v0. The mapping tables produce the same `ExtractedScores` interface — `computeScore()` is unchanged.

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

### Verdict Thresholds

| Score Range | Hank's Stance | Behavior |
|-------------|--------------|----------|
| 0-30 | **Immovable** | "That's a want, not a need. Next." |
| 31-50 | **Firm** | Acknowledges one point, dismantles the rest |
| 51-70 | **Skeptical** | "You've got half a case. But..." — keeps pushing |
| 71-85 | **Reluctant** | "Sleep on it. If you still want it tomorrow, we'll talk." |
| 86-100 | **Concedes** | "Fine. Get the laptop. Yours is ancient." |

Most impulse purchases will land 0-30. That's by design. The app's default answer is no.

### Worked Example

**Turn 1:** "I want to buy a TV"

```
Assessment: intent=want, current_solution=unknown, specificity=vague,
            emotional_triggers=[i_want_it], consistency=first_turn

Mapped:     functional_gap=0, current_state=0, alternatives=0,
            frequency=0, urgency=0, pattern_history=3,
            emotional=-3, specificity=0.4, consistency=1.0

Calculation: (0+0+0)*3.0 + (0+0+3)*1.5 + (-3)*2.0 = -1.5
             -1.5 * 0.4 * 1.0 = -0.6 → clamped to 0
             Score: 0 → IMMOVABLE → stance floor → FIRM

Hank challenges but gives them a chance to argue.
```

**Turn 2:** "My current TV broke last week, I watch it every day"

```
Assessment: intent=replace, current_solution=broken, frequency=daily,
            specificity=specific, consistency=building

Mapped:     functional_gap=9, current_state=9, alternatives=0,
            frequency=9, urgency=0, pattern_history=3,
            emotional=0, specificity=1.2, consistency=1.2

Calculation: (9+9+0)*3.0 + (9+0+3)*1.5 + 0*2.0 = 72
             72 * 1.2 * 1.2 = 103.68 → clamped to 100

With electronics (1.3) + unknown price (1.0) → threshold multiplier 1.3:
  SKEPTICAL threshold: 70 * 1.3 = 91
  Score 100 > 91 → RELUCTANT

Hank is almost convinced but pushes for final proof.
```

### Price Tier Modifiers

Price changes how hard Hank fights — not his personality, just the bar to clear. A $5 coffee doesn't get the same grilling as a $600 pair of headphones. But Hank still sounds like Hank at every tier.

| Price Range | Threshold Modifier | Hank's Energy |
|------------|-------------------|---------------|
| Under $15 | x0.6 | Light pushback. One exchange, maybe two. "Fine, but you asked." |
| $15-50 | x0.8 | Standard skepticism. 2-3 exchanges. |
| $50-200 | x1.0 | Full Hank. The default experience. |
| $200-500 | x1.2 | Extra scrutiny. "That's rent money in some cities." |
| $500+ | x1.4 | Hank at his hardest. You better have a real case. |

Small purchase approvals still feel earned — Hank doesn't rubber stamp. He lets it through with a jab. "You have beer at home. But fine, it's Tree House. Don't make it a habit." That one line is the difference between a yes-machine and Hank.

Price tier and category modifiers stack. A $40 beer is x0.8 (price) with no category bump. A $1,200 laptop is x1.4 (price) x1.3 (electronics) = x1.82. A $50,000 car is x1.4 (price) x1.5 (cars) = x2.1. Good luck.

### Category Modifiers

Some categories deserve extra skepticism by default. These are the purchases people waste the most on — high-ticket items where "I want something nicer" masquerades as need.

The category modifier scales the concession threshold up, making it harder to reach approval.

| Category | Modifier | Why |
|----------|----------|-----|
| **Cars** | x1.5 | Ultimate depreciating asset. Loses 20% driving off the lot. "Does it start? Does it get you there? Then no." Only approved if the current one is genuinely unsafe or repair costs exceed value. |
| **Electronics** | x1.3 | New model every year. "Your phone is 2 years old" is not broken. Hank doesn't care about spec bumps. |
| **Fashion/Shoes** | x1.2 | Alternatives owned is almost always high. "You have 8 jackets. What's number 9 going to do?" |
| **Furniture** | x1.1 | Slightly elevated. People replace functional furniture for aesthetics. |
| **Essentials** | x1.0 | No modifier. Groceries, hygiene, medicine — Hank's not a monster. |
| **Safety/Health** | x0.8 | Easier to approve. Broken smoke detector, failing brakes, medical needs — Hank doesn't mess around with safety. |

**How it works:** The concession threshold (normally 86) gets multiplied by the category modifier. A car needs a score of ~129 on a 100-point scale — meaning you basically need perfect scores on every factor plus high multipliers. That's by design. You almost can't get a car past Hank unless it's genuinely dying.

**The LLM detects the category** from the user's description or photo. The function applies the modifier. The user never sees the numbers — they just feel Hank being harder on some things than others.

**Category-specific Hank lines:**
- Cars: "Does it start? Does it stop? Then you have a car. Case closed."
- Electronics: "Your current one does everything the new one does. You just want the ad to stop haunting you."
- Fashion: "You own 8 jackets. This isn't a gap in your wardrobe. This is a hobby."
- Shoes: "How many feet do you have? Two. How many pairs do you own? Exactly."

### Out-of-Scope Categories

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

- **LLM extracts assessment** as structured JSON — classifications, not numbers — alongside Hank's conversational response
- **Convex function** maps classifications to scores via lookup tables, computes weighted total, applies stance floor, returns stance
- **Stance feeds back** into the next LLM call as context: "Your stance is FIRM. Do not concede."
- **Conversation history** stored in Convex, fed as context for pattern detection
- **Past conversations** summarized and injected for cross-session memory

The LLM prompt explicitly says: "You do not decide when to concede. You will be told your stance. Follow it."

### Key Files

| File | Role |
|------|------|
| `convex/llm/scoring.ts` | Assessment types, mapping tables, `mapAssessmentToScores()`, `computeScore()`, `applyStanceFloor()` |
| `convex/llm/prompt.ts` | System prompt with classification extraction guidelines |
| `convex/llm/generate.ts` | Orchestrates: LLM call → parse assessment → map → score → save |
| `src/components/admin/TraceDetail.tsx` | Admin trace viewer (shows Assessment + Mapped Scores + Scoring Result) |

### Trace Data (Admin Debugging)

Traces store three layers for each turn:
- **Assessment** — the raw LLM classifications (`intent: "want"`, `current_solution: "broken"`, etc.)
- **Mapped Scores** — the deterministic output of the lookup tables (`functional_gap: 9`, `current_state: 9`, etc.)
- **Scoring Result** — the final computation (`score: 86`, `stance: "RELUCTANT"`, `thresholdMultiplier: 1.3`)

When a stance floor is applied, the trace `decisionType` shows `"normal (stance floored)"`.

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

The mapping table values are hypothetical and need testing with real conversations. Adjust based on:

- Is the concession rate around 10-15%? (Too high = too easy, too low = feels rigged)
- Are concessions going to genuinely justified purchases?
- Are users finding obvious gaming strategies?
- Does the conversation feel varied or repetitive?
- Are stance jumps between turns too volatile? (If so, consider a max-one-level-per-turn cap)

The mapping tables are knobs. Change a number, redeploy, every conversation is affected consistently. That's the advantage of deterministic scoring over LLM calibration — tuning is predictable.

### Known Tradeoffs (v0 → v1)

**Better:**
- Consistency — same classification always produces the same score
- Debuggability — traces show readable classifications, not opaque numbers
- Tunability — change a lookup table value, not a prompt paragraph

**Watch for:**
- Score volatility — one strong argument can cause a big stance jump because the tables map mechanically with no "go slowly" instinct. Price/category modifiers dampen this for expensive items. May need a max-one-stance-level-per-turn cap if jumps feel too fast in practice.
- Granularity loss — "kinda failing" has to be either `failing` (→6) or `working` (→0). The step function is coarser than a continuous 0-10 scale. Multiple factors combining still produce fine-grained total scores, but individual dimensions are discrete.
