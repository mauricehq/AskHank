# Debug Trace Spec (v2)

Documents the LLM trace system and debug UI as currently implemented.

---

## 1. Schema: `llmTraces` Table

Defined in `convex/schema.ts`. Stores the full request/response pipeline for every LLM turn.

```
llmTraces: defineTable({
  // Links
  conversationId    v.id("conversations")
  messageId         v.optional(v.id("messages"))   // absent on error traces

  // Request
  systemPrompt      v.string()          // full system prompt sent
  messagesArray     v.string()          // JSON-stringified messages array
  modelId           v.string()          // e.g. "deepseek/deepseek-chat"
  temperature       v.number()
  maxTokens         v.number()

  // Response
  rawResponse       v.string()          // raw LLM content (before parsing)
  parsedResponse    v.string()          // JSON-stringified StructuredResponse

  // Scores
  rawScores         v.string()          // JSON-stringified raw assessment from LLM
  sanitizedScores   v.string()          // JSON-stringified mapped scores
  scoringResult     v.string()          // JSON-stringified { rawScore, score, stance, thresholdMultiplier }

  // Stance
  previousStance    v.string()          // stance before this turn
  newStance         v.string()          // stance after scoring

  // Decision
  decisionType      v.string()          // see §2
  category          v.optional(v.string())
  estimatedPrice    v.optional(v.number())
  disengagementCount v.number()
  stagnationCount   v.number()

  // Metrics
  tokenUsage        v.object({ promptTokens, completionTokens, totalTokens })
  durationMs        v.number()          // wall-clock ms for the LLM call

  // Tool calling (v2)
  toolCalled        v.optional(v.boolean())   // true = scoring turn, false = casual
  toolArguments     v.optional(v.string())    // JSON-stringified tool args (LLM assessment)
  toolResult        v.optional(v.string())    // JSON-stringified tool result (stance returned)

  // Error
  error             v.optional(v.string())

  createdAt         v.number()
})
  .index("by_conversation", ["conversationId", "createdAt"])
  .index("by_message", ["messageId"])
```

Heavy fields (`systemPrompt`, `messagesArray`, `rawResponse`, `parsedResponse`, `rawScores`) are excluded from summary queries and lazy-loaded via `getFullTrace`.

---

## 2. Decision Types

All 10 types emitted by `convex/llm/generate.ts`:

| Type | When | Color |
|---|---|---|
| `normal` | Standard scored turn, no guardrail applied | blue |
| `normal (stance floored)` | Scored turn where stance was guardrailed (shifted ≤1 level) | blue |
| `casual` | LLM did not call the scoring tool (chit-chat, follow-up question) | zinc/gray |
| `out-of-scope` | Item not a purchase / not something Hank evaluates | zinc/gray |
| `concede` | Score crossed threshold — Hank approves the purchase | green |
| `disengagement-increment` | User seems disengaged; counter incremented, warning issued | yellow |
| `disengagement-denied` | Disengagement counter hit limit; conversation closed (denied) | red |
| `stagnation-increment` | Score hasn't moved; stagnation counter incremented, nudge issued | yellow |
| `stagnation-denied` | Stagnation counter hit limit; conversation closed (denied) | red |
| `error` | LLM call or parsing failed; error trace saved | red |

---

## 3. Backend: `convex/llmTraces.ts`

Three exports:

**`saveTrace`** — `internalMutation`. Called from `generate.ts` in a try/catch (non-fatal). Inserts a row with `createdAt: Date.now()`.

**`getTraceSummariesForConversation`** — `query` (admin-only via `requireAdmin`). Returns lightweight summaries for all traces in a conversation. Excluded fields: `systemPrompt`, `messagesArray`, `rawResponse`, `parsedResponse`, `rawScores`, `toolArguments`, `toolResult`.

Returned summary shape:
```typescript
{
  _id, messageId, previousStance, newStance,
  sanitizedScores, scoringResult,
  category, estimatedPrice,
  disengagementCount, stagnationCount,
  decisionType, toolCalled,
  durationMs, tokenUsage, error
}
```

**`getFullTrace`** — `query` (admin-only). Returns the complete trace row by ID. Used for lazy-loading heavy fields.

---

## 4. Frontend Architecture

### Type: `TraceSummary`

Defined in `src/types/chat.ts`. Derived directly from the Convex query return type:

```typescript
export type TraceSummary = NonNullable<
  FunctionReturnType<typeof api.llmTraces.getTraceSummariesForConversation>
>[number];
```

No manually maintained interface — stays in sync with the query automatically.

### Data flow: `ChatScreen.tsx`

1. `useUserAccess()` provides `isAdmin`
2. `useQuery(api.llmTraces.getTraceSummariesForConversation, ...)` fires only when admin and `activeConversationId` is set (otherwise `"skip"`)
3. `useMemo` builds a `Map<string, TraceSummary>` keyed by `messageId`
4. Each `<MessageBubble>` receives the matching trace (if any) via `traceByMessageId.get(msg.id)`

### Inline DebugBar: `MessageBubble.tsx`

Rendered inside Hank message bubbles when a `trace` prop is present. Expandable — collapsed shows a single line:

- **Stance transition**: `previousStance → newStance`
- **Decision type**: colored badge (see §2 color table)
- **Score**: parsed from `scoringResult` JSON
- **Metrics**: total tokens + duration in ms

Expanded state shows a key/value grid of all scores from `sanitizedScores`.

`DECISION_COLORS` maps all 10 decision types to Tailwind classes. Fallback for unknown types: `bg-white/10 text-zinc-400`.

### Full trace view: `admin/TraceDetail.tsx`

Lazy-loads via `useQuery(api.llmTraces.getFullTrace, { traceId })`. Collapsible sections:

1. **Model Config** — model ID, temperature, max tokens (default open)
2. **Tool Call** — scoring vs casual turn indicator, tool arguments (LLM assessment), tool result (stance returned) (default open, only shown when `toolCalled` is not null)
3. **Scores Breakdown** — raw assessment, mapped scores, scoring result (default open; shows "No scoring" for casual turns)
4. **System Prompt** — full prompt in `<pre>` block
5. **Messages Array** — JSON-formatted message history
6. **Raw LLM Response** — raw content string
7. **Parsed Response** — structured parsed output
8. **Timing** — duration, prompt/completion/total tokens (default open)
9. **Error** — red highlighted error message (only shown when `error` is present)

### Non-admin users

See only message bubbles. No trace queries fire, no debug UI renders.

---

## 5. Design Principles

- **Trace writes never break the happy path.** `saveTrace` is wrapped in try/catch in `generate.ts`.
- **Link via messageId on the trace, not traceId on the message.** The `messages` table is untouched.
- **Lazy-load heavy data.** Summary queries exclude large string fields. Full trace is fetched on demand.
- **Type safety via Convex inference.** `TraceSummary` is derived from the query return type, not manually defined.
