# AskHank Architecture

## Overview

AskHank is an AI that talks people out of buying things. The user describes a purchase, Hank (the AI personality) challenges them through conversation, a scoring engine evaluates their arguments, and Hank holds firm unless they make a genuinely strong case. ~10-15% concession rate.

The core tension: LLMs are sycophantic. They want to agree. Hank's job is to disagree. The architecture separates **judgment** (LLM classifies facts) from **decision** (code determines stance) from **delivery** (LLM speaks in character). The LLM is the mouth. The scoring engine is the spine.

---

## Architecture Versions

### v0 — LLM Scores Directly (Retired)

The LLM extracted numerical scores on 0-10 scales (`functional_gap: 3`, `current_state: 7`). Problem: LLMs can't calibrate numbers consistently. Same input would get different scores across conversations. Debugging was guesswork — what does `current_state: 4` mean?

### v1 — Fact-Based Assessment (Current)

The LLM classifies facts into categories (`intent: "replace"`, `current_solution: "broken"`). Our code maps classifications to scores via deterministic lookup tables. Same formula, same weights — just better inputs. See `docs/hank-scoring-engine.md` for full scoring details.

**Known limitation:** Single LLM call per turn. The LLM writes Hank's response AND extracts the assessment simultaneously. The stance Hank follows is from the *previous* turn. The assessment extracted feeds scoring for the *next* turn. One-turn lag — Hank responds to a strong argument with the old stance, and adjusts one turn too late.

### v2 — Tool-Calling Architecture (Proposed)

Split assessment and response into a tool-calling flow. The LLM extracts an assessment, calls `get_stance` to get the score, then writes Hank's response with the correct stance for THIS turn's argument. Also enables casual chat that doesn't trigger scoring. See [v2 Proposal](#v2-tool-calling-architecture-proposed) below.

---

## System Components

```
┌─────────────────────────────────────────────────────┐
│                     Frontend                         │
│  Next.js / TypeScript / Tailwind / Framer Motion     │
│                                                      │
│  ChatScreen ←→ Convex React hooks ←→ Convex backend  │
│  HistoryList                                         │
│  Admin: TraceInspector, TraceDetail                  │
└──────────────────────┬──────────────────────────────┘
                       │ Convex queries/mutations
                       ▼
┌─────────────────────────────────────────────────────┐
│                   Convex Backend                     │
│                                                      │
│  conversations.ts   ← Public API (auth-gated)        │
│  llmTraces.ts       ← Admin queries                  │
│                                                      │
│  llm/generate.ts    ← Internal action (orchestrator) │
│  llm/prompt.ts      ← Prompt builder                 │
│  llm/scoring.ts     ← Scoring engine (deterministic) │
│  llm/openrouter.ts  ← LLM API client                │
│                                                      │
│  lib/roles.ts       ← Auth helpers (requireUser,     │
│                       requireAdmin)                  │
└──────────────────────┬──────────────────────────────┘
                       │ HTTPS
                       ▼
┌─────────────────────────────────────────────────────┐
│                    OpenRouter                        │
│         Claude Haiku / GPT-4o-mini                   │
│         (cheap, fast, JSON mode)                     │
└─────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Does | Does NOT |
|-----------|------|----------|
| **LLM** | Classify facts, detect emotions, write Hank's voice | Decide stance, choose when to concede |
| **Scoring Engine** | Map classifications → scores, compute weighted total, determine stance | Generate text, interpret conversation |
| **Prompt Builder** | Construct system prompt with dynamic config (stance, counters, price) | Store state, make decisions |
| **Orchestrator** (generate.ts) | Wire everything together, handle decision paths, save results | Score, prompt, or generate — delegates all three |
| **Conversations** | Manage state machine, store messages, enforce auth | Score or generate — schedules LLM action |
| **OpenRouter Client** | HTTP bridge to LLM API | Cache, retry, or make decisions |

---

## Data Flow (v1 — Current)

### Per-Turn Flow

```
User sends message
    │
    ▼
conversations.send(conversationId, content)
    ├── Auth check (requireUser)
    ├── Create conversation if new (status: "thinking")
    ├── Insert user message into messages table
    ├── Set conversation status → "thinking"
    └── Schedule internal action: llm/generate.respond()
         │
         ▼
    ┌─ FETCH CONTEXT ─────────────────────────────┐
    │  messages = all messages in conversation      │
    │  conversation = current state (stance,        │
    │    disengagementCount, stagnationCount,        │
    │    estimatedPrice, category)                  │
    │  turnCount = count of user messages           │
    │  modelId = from appSettings                   │
    │  displayName = user's name                    │
    └──────────────────────────────────────────────┘
         │
         ▼
    ┌─ BUILD PROMPT ──────────────────────────────┐
    │  System prompt includes:                     │
    │    - Hank personality + rules                │
    │    - Current stance instruction              │
    │    - Price context (if known)                │
    │    - Conversation progress guidance           │
    │    - Assessment extraction guidelines         │
    │    - Disengagement/stagnation warnings        │
    │  Messages array: system + conversation        │
    └──────────────────────────────────────────────┘
         │
         ▼
    ┌─ LLM CALL (single) ────────────────────────┐
    │  OpenRouter API with JSON mode               │
    │  Returns: {                                  │
    │    response: "Hank's message",               │
    │    assessment: { intent, current_solution,   │
    │      frequency, urgency, ... },              │
    │    category, estimated_price,                │
    │    is_non_answer, is_out_of_scope,           │
    │    has_new_information                        │
    │  }                                           │
    └──────────────────────────────────────────────┘
         │
         ▼
    ┌─ PARSE + VALIDATE ─────────────────────────┐
    │  Parse JSON (with fallbacks for markdown     │
    │    code blocks, brace extraction)            │
    │  Sanitize assessment: validate each enum     │
    │    field against allowed values, fallback     │
    │    to safe defaults                          │
    └──────────────────────────────────────────────┘
         │
         ▼
    ┌─ MAP + SCORE ──────────────────────────────┐
    │  mapAssessmentToScores(assessment)            │
    │    → ExtractedScores (9 numeric fields)       │
    │                                              │
    │  computeScore(scores, price, category)        │
    │    → ScoringResult { score, stance,           │
    │        rawScore, thresholdMultiplier }        │
    │                                              │
    │  applyStanceFloor(stance, turnCount)          │
    │    → IMMOVABLE promoted to FIRM on turns 1-2 │
    └──────────────────────────────────────────────┘
         │
         ▼
    ┌─ DECISION ROUTING ─────────────────────────┐
    │                                              │
    │  is_out_of_scope?                            │
    │    → Save response, skip scoring. Done.      │
    │                                              │
    │  Previous stance was CONCEDE?                │
    │    → Save as approved verdict. Done.          │
    │                                              │
    │  is_non_answer + disengagementCount ≥ 1?     │
    │    → Save as denied verdict. Done.            │
    │                                              │
    │  is_non_answer (first time)?                 │
    │    → Save response, increment counter.       │
    │                                              │
    │  !has_new_information + stagnation ≥ 4?      │
    │    → Save as denied verdict. Done.            │
    │                                              │
    │  !has_new_information (stagnation < 4)?       │
    │    → Save response, increment counter.       │
    │                                              │
    │  Normal turn:                                │
    │    → Save response with score/stance.         │
    │    → Reset disengagement + stagnation to 0.  │
    │                                              │
    └──────────────────────────────────────────────┘
         │
         ▼
    Save trace to llmTraces (non-fatal)
         │
         ▼
    Hank's message appears in UI
    (conversation subscription triggers re-render)
```

### The One-Turn Lag (v1 Problem)

```
Turn 1:
  Prompt says stance = FIRM (default)
  LLM writes FIRM response + extracts assessment
  Assessment → score → new stance (FIRM after floor)
  Saved for turn 2.

Turn 2:
  User says "my TV broke, I use it daily" (strong argument)
  Prompt says stance = FIRM (from turn 1 scoring)
  LLM writes FIRM response ← WRONG TONE for this argument
  Assessment → score → new stance (RELUCTANT)
  Saved for turn 3.

Turn 3:
  User says "yeah, so can I buy it?"
  Prompt says stance = RELUCTANT (from turn 2 scoring)
  LLM writes RELUCTANT response ← tone doesn't match THIS message
```

Hank's response is always one turn behind the argument that should have shifted his stance. The user gives a strong argument and Hank ignores it. Next turn, Hank softens for no apparent reason.

---

## v2 Tool-Calling Architecture (Proposed)

### Core Idea

Replace the single LLM call with a tool-calling flow. The LLM classifies the argument, calls a tool to get the stance, then writes Hank's response with the correct stance for THIS turn.

### Flow

```
User sends message
    │
    ▼
conversations.send() — same as v1
    │
    ▼
llm/generate.respond()
    │
    ├── Fetch context (same as v1)
    ├── Build system prompt (modified — no assessment guidelines,
    │     includes tool definition instead)
    │
    ▼
┌─ LLM CALL (with tool) ──────────────────────────────┐
│                                                       │
│  System prompt tells Hank:                            │
│    - Your personality and rules                       │
│    - You have a get_stance tool                       │
│    - Call it when the user makes an argument about     │
│      their purchase (new facts, new angle, defense)   │
│    - Do NOT call it for casual chat, clarifying        │
│      questions, or information gathering              │
│    - Your current stance is [previous stance]         │
│    - You CANNOT concede without the tool returning     │
│      CONCEDE                                          │
│                                                       │
│  Tool definition:                                     │
│    get_stance({                                       │
│      assessment: { intent, current_solution, ... },   │
│      is_non_answer: bool,                             │
│      has_new_information: bool,                       │
│      category: string,                                │
│      estimated_price: number                          │
│    })                                                 │
│    → Returns: { stance, score, guidance }              │
│                                                       │
│  The LLM either:                                      │
│    A) Calls the tool → gets stance → writes response  │
│    B) Skips the tool → writes response at current      │
│       stance (casual chat / info gathering)            │
│                                                       │
└───────────────────────────────────────────────────────┘
```

### Phase A: Tool Called (Scoring Turn)

```
LLM reads conversation
    │
    ▼
LLM generates tool call:
  get_stance({
    assessment: { intent: "replace", current_solution: "broken", ... },
    is_non_answer: false,
    has_new_information: true,
    category: "electronics",
    estimated_price: 500
  })
    │
    ▼
Our code (server-side):
  1. sanitizeAssessment(assessment)
  2. mapAssessmentToScores(assessment) → ExtractedScores
  3. computeScore(scores, price, category) → ScoringResult
  4. applyStanceFloor(stance, turnCount)
  5. Check disengagement / stagnation rules
  6. Return { stance, score, guidance }
    │
    ▼
LLM receives tool result:
  { stance: "SKEPTICAL", score: 62, guidance: "They've made half a case..." }
    │
    ▼
LLM writes Hank's response following SKEPTICAL stance
    │
    ▼
Our code saves message + scoring + trace
```

**Key insight:** The LLM gets the stance BEFORE writing its response. No lag. Hank reacts to the argument that just happened.

### Phase B: No Tool Call (Casual Turn)

```
LLM reads conversation
    │
    ▼
LLM decides this is casual chat / info gathering
(user asked "what model is it?" or said "haha good point")
    │
    ▼
LLM writes response at CURRENT stance (from previous turn)
No scoring happens. No counters change.
    │
    ▼
Our code saves message only (no scoring update)
```

**Key insight:** Not every message is an argument. Hank can banter, ask follow-up questions, and have personality moments without the scoring engine grinding on every syllable.

### What the Tool Returns

```typescript
interface GetStanceResult {
  stance: Stance;
  score: number;
  guidance: string;        // STANCE_INSTRUCTIONS text for the LLM to follow
  verdict?: "approved" | "denied";  // if conversation should close
  closing?: boolean;       // true if this is the final message
}
```

The `guidance` field gives the LLM its marching orders: "They've made half a case. Acknowledge what's valid but push hard on what's weak." This replaces the stance instruction that was previously baked into the system prompt.

If `verdict` is set, the LLM knows this is the final message and should write accordingly (grudging approval or memorable denial). The `closing` flag tells our code to save as a verdict and close the conversation.

### Disengagement and Stagnation in v2

These mechanics move INTO the tool. When the LLM calls `get_stance` with `is_non_answer: true` or `has_new_information: false`, the tool checks counters and can return a closing verdict:

```
get_stance({ is_non_answer: true, ... })
  → disengagementCount was 1
  → Return: { stance: "FIRM", verdict: "denied", closing: true,
              guidance: "Deliver a final denial. Make it memorable." }
```

The LLM writes the closing line and our code marks the conversation as denied.

If the LLM skips the tool on a non-answer turn (treats it as casual), the counter doesn't increment — which is fine. The next time the tool IS called, the current state catches up.

### Safety Guarantees

**The LLM cannot soften Hank by skipping the tool.**
- No tool call = previous stance persists. Hank stays at least as tough.
- The system prompt says: "Your current stance is FIRM. You cannot move to a softer stance without calling get_stance."
- The LLM can only reach CONCEDE by calling the tool and the scoring engine returning CONCEDE.

**The LLM cannot game the tool by sending false assessments.**
- Same risk as v1 — the LLM fills in the assessment. But it's classifying from a closed set of options, and the scoring is deterministic. A false `intent: "replace"` when the user said "I want" would be caught in trace review.
- The assessment is still the LLM's judgment. The tool just scores it honestly.

**What if the LLM never calls the tool?**
- Hank stays at the default stance (FIRM for new conversations) forever. The user can't win.
- This is the conservative failure mode. Better than the opposite.
- Monitoring: if traces show zero tool calls over many turns, the prompt needs tuning.

**What if the LLM calls the tool on every turn including casual chat?**
- Scores fluctuate on non-argument turns. Assessment might stay the same (no new info = stagnation counter increments).
- This is the v1 behavior. Not great, but not broken.
- Prompt tuning: "Only call the tool when the user presents an argument, defense, or new information."

### Casual Chat Examples

```
User: "I want to buy a TV"
Hank: [calls tool] "A TV. What's wrong with the one you have."

User: "It's a Samsung from like 2019"
Hank: [no tool call — info gathering] "2019. So it's 7 years old. Does it turn on."

User: "Yeah it works but the picture is getting dim"
Hank: [calls tool — new info: failing, frequency context]
      Tool returns: SKEPTICAL
      "Getting dim isn't broken. That's a $50 calibration, not a $500 TV."

User: "Haha yeah maybe. But I watch it every single day"
Hank: [calls tool — new info: frequency=daily]
      Tool returns: SKEPTICAL (still)
      "Watching TV every day isn't a reason to buy a new one. It's a reason to go outside."

User: "lol fair point"
Hank: [no tool call — casual] "I have my moments."
```

The conversation feels natural. Hank has personality between the scoring moments. Not every exchange is an evaluation — some are just... talking.

### Implementation Changes (v1 → v2)

| Component | Change |
|-----------|--------|
| `llm/generate.ts` | Major rewrite. Replace single-call JSON parsing with tool-calling loop. Handle tool execution, response after tool result, and no-tool-call paths. |
| `llm/prompt.ts` | Moderate rewrite. Remove assessment guidelines from system prompt (they move to tool parameter descriptions). Add tool definition. Add "you cannot concede without the tool" instruction. |
| `llm/scoring.ts` | No change. Same types, same mapping tables, same computeScore(). |
| `llm/openrouter.ts` | Add tool-calling support to chatCompletion. Handle tool_calls in response, send tool results back, get final response. |
| `conversations.ts` | Minor. Add a save path for casual messages (no scoring update). |
| `schema.ts` | No change. Trace fields still store JSON strings. |
| `TraceDetail.tsx` | Minor. Show whether tool was called, what it returned. |

### OpenRouter Tool-Calling Flow

```typescript
// Call 1: Send messages with tool definition
const result1 = await chatCompletion({
  messages: llmMessages,
  tools: [{
    type: "function",
    function: {
      name: "get_stance",
      description: "Get Hank's stance based on the user's argument...",
      parameters: { /* assessment schema */ }
    }
  }],
  modelId,
});

// If tool was called:
if (result1.tool_calls) {
  const assessment = JSON.parse(result1.tool_calls[0].function.arguments);
  const stanceResult = executeGetStance(assessment, conversationState);

  // Call 2: Send tool result, get Hank's response
  const result2 = await chatCompletion({
    messages: [
      ...llmMessages,
      result1.message,  // assistant message with tool_call
      {
        role: "tool",
        tool_call_id: result1.tool_calls[0].id,
        content: JSON.stringify(stanceResult)
      }
    ],
    modelId,
  });

  // result2.content is Hank's response with correct stance
}

// If no tool call: result1.content is Hank's casual response
```

Two API round-trips when the tool is called. One round-trip for casual chat. With Haiku-class models, each call is ~200-500ms and fractions of a cent.

---

## Database Schema

### Tables

**users**
```
tokenIdentifier: string     — Auth provider key
email: string
displayName: string
role: "normal" | "insider" | "admin"
Index: by_token(tokenIdentifier)
```

**appSettings**
```
key: string                  — e.g. "hank_model"
value: any
updatedAt: number
updatedBy: Id<"users">
Index: by_key(key)
```

**conversations**
```
userId: Id<"users">
status: "active" | "thinking" | "error" | "closed"
createdAt: number
stance?: string              — Current stance (IMMOVABLE/FIRM/SKEPTICAL/RELUCTANT/CONCEDE)
score?: number               — Latest computed score (0-100)
category?: string            — Purchase category
estimatedPrice?: number      — LLM's price estimate
disengagementCount?: number  — Consecutive non-answers
stagnationCount?: number     — Consecutive repeats
verdict?: "approved" | "denied"
Index: by_user(userId)
```

**messages**
```
conversationId: Id<"conversations">
role: "user" | "hank"
content: string
createdAt: number
Index: by_conversation(conversationId, createdAt)
```

**llmTraces**
```
conversationId: Id<"conversations">
messageId?: Id<"messages">

— Request
systemPrompt: string
messagesArray: string        — JSON string of LLM messages
modelId: string
temperature: number
maxTokens: number

— Response
rawResponse: string          — Raw LLM output
parsedResponse: string       — Parsed structured response (JSON string)

— Scoring
rawScores: string            — Assessment object (JSON string)
sanitizedScores: string      — Mapped ExtractedScores (JSON string)
scoringResult: string        — ScoringResult (JSON string)

— Stance
previousStance: string
newStance: string

— Decision
decisionType: string         — "normal", "normal (stance floored)",
                                "concede", "disengagement-denied",
                                "stagnation-denied", "out-of-scope",
                                "error"
category: string
estimatedPrice?: number
disengagementCount: number
stagnationCount: number

— Metrics
tokenUsage: { promptTokens, completionTokens, totalTokens }
durationMs: number
error?: string

Index: by_conversation(conversationId, _creationTime)
Index: by_message(messageId)
```

### Conversation State Machine

```
                    ┌──────────┐
         send() ──→│ thinking │
                    └────┬─────┘
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
         ┌────────┐ ┌────────┐ ┌───────┐
         │ active │ │ error  │ │closed │
         └───┬────┘ └────────┘ └───────┘
             │
      send() │
             ▼
        ┌──────────┐
        │ thinking │──→ active (normal turn)
        └──────────┘──→ closed (verdict: approved/denied)
                    ──→ error  (LLM failure)
```

- `active` → user can send messages
- `thinking` → LLM is processing, user sees typing indicator
- `closed` → conversation over, verdict set, no further messages
- `error` → LLM failed, user sees error state

---

## Security Model

Convex has no RLS. Security is enforced in function handlers.

### Auth Checks

Every public query/mutation starts with `requireUser(ctx)` or `requireAdmin(ctx)` from `convex/lib/roles.ts`.

| Function | Auth | Additional checks |
|----------|------|-------------------|
| `send` | requireUser | Ownership check on existing conversation |
| `listForUser` | requireUser | Filters by userId |
| `getConversation` | requireUser | Ownership check |
| `getMessages` | requireUser | Ownership check |
| `getTraceSummaries` | requireAdmin | — |
| `getFullTrace` | requireAdmin | — |
| All `internal*` functions | No auth | Only callable server-side |

### Input Validation

- Convex validators (`v.string()`, `v.id()`, etc.) on all function args
- Assessment enum fields validated against allowed values with safe defaults
- Price and category coalesced (0 = unknown, "other" = unknown)

### Internal vs Public Functions

- `query` / `mutation` / `action` — callable by clients, must have auth
- `internalQuery` / `internalMutation` / `internalAction` — only callable by server code (equivalent to service_role)

---

## Key Files Reference

| File | Role | Changes often? |
|------|------|---------------|
| `convex/llm/generate.ts` | Orchestrator — wires LLM call, parsing, scoring, decision routing | Yes (core logic) |
| `convex/llm/scoring.ts` | Assessment types, mapping tables, computeScore, stance floor | When tuning scores |
| `convex/llm/prompt.ts` | System prompt builder with dynamic config | When adjusting Hank's voice/rules |
| `convex/llm/openrouter.ts` | HTTP client for OpenRouter API | Rarely |
| `convex/conversations.ts` | Public API + internal mutations for conversation state | When adding features |
| `convex/llmTraces.ts` | Trace storage and admin queries | Rarely |
| `convex/schema.ts` | Database schema | When adding tables/fields |
| `convex/lib/roles.ts` | Auth helpers (requireUser, requireAdmin) | Rarely |
| `src/components/admin/TraceDetail.tsx` | Admin trace viewer UI | When trace format changes |

---

## Trace System (Admin Debugging)

Every LLM turn produces a trace record with three layers:

1. **Assessment** — raw LLM classifications (`intent: "want"`, `current_solution: "broken"`)
2. **Mapped Scores** — deterministic lookup output (`functional_gap: 9`, `current_state: 9`)
3. **Scoring Result** — final computation (`score: 86`, `stance: "RELUCTANT"`, `thresholdMultiplier: 1.3`)

Plus full request/response data: system prompt, messages array, raw LLM output, token usage, latency.

When the stance floor is applied, `decisionType` shows `"normal (stance floored)"`.

Traces are saved non-fatally — if trace storage fails, the conversation continues. Admin-only access via `TraceInspector` UI.

---

## Future Considerations

### Conversation Pacing

The scoring engine has no concept of "too fast." A single well-crafted argument can jump multiple stance levels. Potential fix: cap stance progression to one level per turn (FIRM → SKEPTICAL → RELUCTANT → CONCEDE over minimum 4 turns). Not yet implemented — waiting for real conversation data to confirm it's needed.

### Cross-Session Memory

Documented in `docs/hank-scoring-engine.md`. Conversation summaries and user dossier injected as YAML into the system prompt. Not yet implemented but designed to be cheap (~2,000 tokens overhead).

### Pattern History

Currently defaults to `unknown` (→3) every conversation. With cross-session memory, this becomes a real signal — "third time asking about headphones this month" actively hurts the score.
