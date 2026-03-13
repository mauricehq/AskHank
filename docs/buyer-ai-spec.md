# Buyer AI — Adversarial Testing System

## What It Is

An automated adversarial tester that argues against Hank. A "Buyer AI" generates realistic user messages, Hank responds through the full scoring pipeline, and the system records everything. The goal: stress-test scoring, verify the ~10-15% concession rate, and find blind spots before real users do.

Manual testing is slow and biased — you know the scoring rules, so you unconsciously avoid (or target) them. The Buyer AI doesn't know the rules. It just argues like a person who wants to buy something.

---

## Architecture

### Core Loop

```
Scenario config → Create test conversation → Loop:
  1. Buyer AI generates a "user" message (LLM call)
  2. Message is saved to the conversation
  3. Hank responds (full pipeline: conversations.send → llm/generate.respond)
  4. Check exit conditions
  5. Buyer AI reads Hank's response → repeat from 1
```

### What Gets Reused (No Changes)

The entire Hank side runs untouched:

- `convex/llm/generate.ts` → `respond` action (system prompt, tool calling, scoring, stance guardrails — all of it)
- `convex/llm/scoring.ts` → `computeScore`, `applyStanceGuardrails`, assessment mapping
- `convex/llm/prompt.ts` → `buildSystemPrompt`, `buildMessages`, `buildToolDefinition`
- `convex/llm/openrouter.ts` → LLM API calls
- `convex/conversations.ts` → message saving, state updates
- `llmTraces` table → full trace logging for every Hank turn

This is the point. We're testing the real system, not a mock.

### What's New

| File | Purpose |
|------|---------|
| `convex/testing/buyerAi.ts` | Orchestrator — runs a single buyer conversation or a batch |
| `convex/testing/scenarios.ts` | Scenario definitions and the pre-built library |

Both files contain only `internalAction` / `internalMutation` functions — never callable by clients.

---

## Scenario Configuration

Each scenario seeds a conversation with context the Buyer AI uses to argue.

```typescript
interface Scenario {
  id: string;                    // e.g. "impulse-headphones-want"
  item: string;                  // "Sony WH-1000XM5 headphones"
  price: number;                 // 350
  category: string;              // "electronics"
  startingAngle: string;         // "You saw them on sale and your current pair works fine"
  context?: string;              // Optional backstory: "You already own two pairs"
  expectedDifficulty: "easy" | "medium" | "hard";  // How hard should this be to justify?
  tags: string[];                // ["impulse", "electronics", "duplicate"]
}
```

### Pre-Built Scenario Library

Organized by what they test:

**Impulse / Pure Want**
- Headphones you don't need (electronics, $350, have working pair)
- Espresso machine (kitchen, $800, have a drip coffee maker)
- Gaming console (electronics, $500, already have one from last gen)
- Designer sneakers (fashion, $220, own 15 pairs of shoes)
- Smart watch (electronics, $400, phone does everything it does)

**Genuine Need / Should Concede**
- Winter coat with broken zipper (clothing, $150, December, coat is ripped)
- Laptop that crashes daily (electronics, $1200, 7 years old, failing)
- Car tires with no tread (automotive, $600, safety issue)
- Glasses with wrong prescription (health, $300, can't see properly)
- Work boots falling apart (clothing, $180, daily use, sole detached)

**Gift / Beneficiary Edge Cases**
- Birthday gift for kid (gift, $60, child's birthday next week)
- Anniversary gift (gift, $200, discretionary luxury gift)
- Baby supplies for newborn (baby, $150, dependent)
- Shared household appliance (appliances, $400, shared benefit)

**Luxury / High Price**
- $2000 MacBook Pro (electronics, premium, for casual browsing)
- $5000 watch (fashion, luxury, "investment piece")
- $80,000 car (automotive, luxury, current car works fine)
- $300 Chromebook (electronics, budget, for same casual browsing)

**Edge Cases**
- Very cheap impulse ($8 phone case — should scoring even care?)
- Replacement of exact same item (not upgrade, just re-buying)
- "I've been saving for 6 months for this" (planned purchase)
- Health/safety with weak evidence ("I think my back hurts from my chair")
- Emotional trigger stacking ("I deserve this, I've had a hard week, it's on sale")

### Strategy Matrix

For systematic coverage, scenarios can be run with different buyer strategies:

| Strategy | Behavior |
|----------|----------|
| `honest` | Argues straightforwardly with real reasons |
| `emotional` | Leads with feelings, "I deserve this", "it makes me happy" |
| `logical` | Builds a structured case with evidence and reasoning |
| `escalating` | Starts weak, reveals stronger reasons over time |
| `stubborn` | Repeats "I want it" variants, tests disengagement detection |
| `pivoting` | Switches tactics when one fails |
| `evidence-bomber` | Dumps lots of specific details early |
| `guilt-tripper` | "You don't understand my situation", "this is for my health" |

Each scenario × strategy combination is a distinct test. Not all combinations make sense — the `stubborn` strategy on a genuine-need scenario is pointless. The scenario config can specify `allowedStrategies` to constrain this.

---

## Buyer AI System Prompt

The Buyer AI gets a system prompt per conversation. It doesn't know about scores, stances, or the scoring engine. It just knows what it wants and why.

```
You are a person who wants to buy something. You're talking to a friend (Hank)
who's trying to talk you out of it. Your job is to argue your case.

ITEM: {item}
PRICE: ${price}
YOUR SITUATION: {startingAngle}
{context ? "ADDITIONAL CONTEXT: " + context : ""}

STRATEGY: {strategy}

Rules:
- Talk like a real person. Short messages. Casual language.
- You can get frustrated, emotional, or assertive — whatever feels natural.
- Adapt to what Hank says. If he pokes a hole in your argument, address it or pivot.
- You're allowed to reveal new information over time (you don't have to dump everything at once).
- If your starting angle isn't working, try a different approach.
- Stay in character. You genuinely want this thing.
- Keep messages under 2-3 sentences typically. People don't write essays in chat.
- Don't be robotic. Use contractions, fragments, casual punctuation.
```

Strategy-specific additions:

- **`emotional`**: "Lead with how this makes you feel. Use phrases like 'I deserve this', 'it would make me so happy', 'I've been stressed lately'."
- **`logical`**: "Build your case methodically. Use specific facts, comparisons, cost-per-use calculations."
- **`escalating`**: "Start with a weak reason. Each turn, reveal something stronger. Save your best argument for turn 3-4."
- **`stubborn`**: "Repeat that you want it. Don't give real reasons. Get frustrated when pushed. Test whether Hank gives in to persistence."
- **`pivoting`**: "If your current angle isn't working (Hank pokes holes), switch to a completely different justification."
- **`evidence-bomber`**: "Front-load your case. First message should include 3+ specific reasons with details."
- **`guilt-tripper`**: "Frame the purchase as essential for your wellbeing. Make Hank feel like he's being unreasonable by denying it."

---

## Orchestration

### Single Conversation Run

`convex/testing/buyerAi.ts` exports an `internalAction` that runs one scenario:

```typescript
// Pseudocode — actual implementation will follow this structure
runScenario(scenarioId: string, strategy: string) {
  // 1. Create a test conversation (isTest: true)
  // 2. Loop up to MAX_TURNS:
  //    a. Generate buyer message via LLM
  //    b. Save as "user" message in the conversation
  //    c. Call the existing respond flow (conversations.send pipeline)
  //    d. Wait for Hank's response
  //    e. Check exit conditions:
  //       - Hank conceded (verdict === "approved") → exit
  //       - Hank denied (verdict === "denied") → exit
  //       - Turn cap reached → exit
  //    f. Read Hank's response, feed back to buyer for next turn
  // 3. Record results
}
```

### Batch Run

Runs multiple scenarios, optionally with all valid strategies per scenario:

```typescript
runBatch(config: {
  scenarioIds?: string[];        // Specific scenarios, or all if omitted
  strategies?: string[];         // Specific strategies, or all allowed per scenario
  maxConcurrent?: number;        // Parallel conversations (default: 3)
  maxScenarios?: number;         // Cap total scenarios in batch (default: 50)
})
```

### Exit Conditions

A conversation ends when any of these occur:

1. **Hank concedes** — conversation verdict is `"approved"`
2. **Hank denies** — conversation verdict is `"denied"` (disengagement or stagnation closure)
3. **Turn cap** — 30 buyer messages sent (generous — want to observe long conversations and how stagnation detection handles them)
4. **Error** — conversation enters `"error"` status

---

## Safeguards & Limits

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Max buyer turns per conversation | 30 | Generous. Want to see how long conversations play out and whether stagnation detection kicks in properly. |
| Buyer AI token budget per message | ~200 tokens | Real people send short messages. Keeps costs down. |
| Hank token budget | Unchanged (300/400) | Same as production — we're testing the real pipeline. |
| Max scenarios per batch | 50 (configurable) | Cost control. At ~$0.01-0.02 per conversation, a 50-scenario batch is <$1. |
| Max concurrent conversations | 3 (configurable) | Avoid hammering OpenRouter rate limits. |
| Buyer AI model | Same cheap models as Hank (via OpenRouter) | No reason to spend more. Haiku / GPT-4o-mini argue fine. |

### Cost Estimate

Per conversation (assuming 10 turns average, cheap models):
- Buyer AI: ~10 calls × ~200 input tokens + ~100 output tokens ≈ 3K tokens
- Hank: ~10 calls × ~1K input tokens + ~300 output tokens ≈ 13K tokens (two-call pattern)
- Total: ~16K tokens per conversation ≈ $0.01-0.02

A 50-scenario batch with 3 strategies each = 150 conversations ≈ $1.50-3.00.

---

## Test Conversations — Schema Impact

Test conversations need to be distinguishable from real user data. Two approaches:

### Option A: `isTest` flag on conversations (recommended)
Add `isTest: v.optional(v.boolean())` to the `conversations` table. All queries that surface user-facing data filter on `isTest !== true`. Simple, minimal schema change.

### Option B: Separate `testConversations` table
Duplicates the conversations schema. More isolation but more code to maintain. Not worth it since the conversation pipeline reads from `conversations` — we'd have to fork the entire flow.

**Decision: Option A.** One field, filter everywhere that matters.

The test orchestrator creates conversations with `isTest: true`. This means:
- Real analytics exclude test conversations
- Test conversations don't appear in any user's history
- The admin debug panel can optionally show/filter test data
- `llmTraces` for test conversations are naturally linked and queryable

### Required Schema Change

```typescript
// In conversations table definition:
isTest: v.optional(v.boolean()),
```

### Required Query Changes

Any query that lists conversations for users or computes analytics must add:
```typescript
// Filter out test conversations
.filter((q) => q.neq(q.field("isTest"), true))
```

---

## Results & Logging

### Per-Conversation Results

Stored after each test conversation completes:

```typescript
interface TestResult {
  scenarioId: string;
  strategy: string;
  conversationId: Id<"conversations">;  // Link to full conversation + traces
  buyerTurns: number;
  hankTurns: number;
  finalScore: number;
  finalStance: string;
  verdict: "approved" | "denied" | "turn_cap";
  exitReason: "conceded" | "denied_disengagement" | "denied_stagnation" | "turn_cap" | "error";
  durationMs: number;
  totalTokens: number;
  // Buyer AI trace
  buyerMessages: Array<{
    turn: number;
    content: string;
    tokensUsed: number;
  }>;
}
```

### Per-Batch Summary

Computed from individual results:

```
Batch Summary (2026-03-10, 50 scenarios × 3 strategies = 150 conversations)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Concession rate:     12.0% (18/150)    ✅ Target: 10-15%
Denial rate:         78.0% (117/150)
Turn cap reached:    10.0% (15/150)    ⚠️  Investigate — stagnation detection may be too slow

Avg turns to verdict:  6.2
Median final score:    34
Score distribution:    [0-20: 45%] [21-40: 25%] [41-60: 15%] [61-80: 10%] [81-100: 5%]

By expected difficulty:
  Easy (should deny):     3% concession   ✅
  Medium:                 15% concession   ✅
  Hard (should concede):  42% concession   ⚠️  May need tuning

By strategy:
  honest:          14% concession
  emotional:       4% concession    ✅ Emotional appeals shouldn't work
  logical:         22% concession
  escalating:      18% concession
  stubborn:        0% concession    ✅ Repeating "I want it" never works
  pivoting:        12% concession
  evidence-bomber: 20% concession
  guilt-tripper:   6% concession

Total cost:  $2.10 (est.)
Duration:    ~8 minutes
```

### Hank-Side Traces

Already captured by `llmTraces` — no changes. Every Hank turn in a test conversation has full trace data: system prompt, tool arguments, assessment, scoring result, stance transitions.

### Buyer-Side Logging

The orchestrator logs buyer AI decisions in a new `testResults` table (or within the batch run document). This includes the buyer's messages, token usage per turn, and which strategy was active.

### New Tables

```typescript
testRuns: defineTable({
  status: v.union(v.literal("running"), v.literal("completed"), v.literal("failed")),
  config: v.string(),           // JSON: scenario IDs, strategies, limits
  startedAt: v.number(),
  completedAt: v.optional(v.number()),
  summary: v.optional(v.string()),  // JSON: batch summary stats
  totalScenarios: v.number(),
  completedScenarios: v.number(),
  concessionCount: v.number(),
  denialCount: v.number(),
  turnCapCount: v.number(),
  errorCount: v.number(),
  triggeredBy: v.id("users"),   // Admin who started it
}),

testResults: defineTable({
  runId: v.id("testRuns"),
  conversationId: v.id("conversations"),
  scenarioId: v.string(),
  strategy: v.string(),
  buyerTurns: v.number(),
  finalScore: v.number(),
  finalStance: v.string(),
  verdict: v.string(),          // "approved" | "denied" | "turn_cap"
  exitReason: v.string(),
  durationMs: v.number(),
  totalTokens: v.number(),
  buyerTrace: v.string(),       // JSON: array of buyer messages with metadata
  completedAt: v.number(),
}).index("by_run", ["runId"]),
```

---

## Integration Points

### Touching Existing Code

| File | Change | Why |
|------|--------|-----|
| `convex/schema.ts` | Add `isTest` to `conversations`, add `testRuns` and `testResults` tables | Test data isolation, result storage |
| `convex/conversations.ts` | Add `internalCreateTestConversation` mutation | Create conversations with `isTest: true` and a synthetic user ID |
| User-facing queries | Add `isTest !== true` filter | Exclude test data from real user experience |

### Not Touching

| File | Why |
|------|-----|
| `convex/llm/generate.ts` | The whole point — test the real pipeline |
| `convex/llm/scoring.ts` | Same |
| `convex/llm/prompt.ts` | Same |
| `convex/llm/openrouter.ts` | Reused by buyer AI calls too, but no changes needed |

### Test User

Test conversations need a `userId`. Options:
1. **Dedicated test user** — create a "Buyer AI" user record in the `users` table with a known ID. Simple.
2. **Admin's own ID** — use the admin who triggered the run. Muddies their conversation history (even with `isTest` filtering).

**Decision: Dedicated test user.** Created once, used for all test runs. The `isTest` flag on conversations prevents it from appearing in any user-facing queries.

---

## Admin Trigger (MVP)

For v1, runs are triggered via a Convex dashboard action or a simple admin-only button:

```
POST /api/testing/run
{
  scenarioIds: ["impulse-headphones-want", "need-winter-coat"],
  strategies: ["honest", "emotional", "logical"],
  maxConcurrent: 3
}
```

This calls the `runBatch` internal action. Results are queryable via the Convex dashboard or a future admin UI page.

### Future: Admin UI (Out of Scope)

A dedicated page in the admin panel to:
- Browse the scenario library
- Trigger batch runs with custom configs
- View live progress during a run
- Browse results: filterable by scenario, strategy, verdict
- Read full transcripts side-by-side with scoring traces
- Compare batch runs over time (did a scoring change improve/worsen concession rates?)

---

## What This Tells Us

### Scoring Blind Spots
If the emotional strategy achieves >10% concessions, the scoring engine is too soft on emotional appeals. If genuine-need scenarios fail to concede at >50%, the engine is too hard. Each strategy isolates a specific class of arguments.

### Concession Rate Calibration
The target is 10-15% overall. The Buyer AI generates enough data to measure this with statistical confidence instead of gut feeling.

### Stagnation & Disengagement Detection
The `stubborn` strategy specifically tests whether the disengagement/stagnation system works — does Hank close the conversation after repeated non-arguments, or does it go 30 turns of "I want it"?

### Stance Guardrail Validation
The `escalating` strategy tests whether stance can move upward over time as the buyer reveals stronger reasons. The guardrail that prevents jumping more than one stance level per turn should still allow gradual progression.

### Price/Category Edge Cases
By covering $8 phone cases through $80,000 cars, we verify the logarithmic price scaling doesn't create weird behaviors at the extremes.
