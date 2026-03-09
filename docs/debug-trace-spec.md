# Debug Trace Spec for AskHank

## 1. Overview

Two observability features for AskHank:

**Feature 1 — LLM Trace System.** A new `llmTraces` Convex table that stores the full request/response pipeline for every LLM turn. This captures everything needed to reconstruct and debug any interaction: the system prompt, messages array, raw LLM response, parsed output, scores (both raw and sanitized), scoring result, stance transitions, decision logic, token usage, timing, and errors.

**Feature 2 — Debug UI in Chat.** Two-layer admin-only debug interface:

- **Inline badge:** A compact one-line summary below each Hank message bubble showing stance transition, score, and category. Always visible to admins — no click required.
- **Inspect panel:** A slide-over panel on the right side of the viewport, triggered by clicking any Hank message bubble. Shows the full scoring breakdown (all 9 scores, threshold multiplier, disengagement count, decision type, duration, tokens). A "View full trace" expansion within the panel lazy-loads the system prompt, messages array, and raw LLM response. Only one message inspected at a time — clicking another swaps the panel content, clicking X or the same message closes it.

Only visible to users with `role === "admin"`.

### Design Principles

- **Trace writes must not break the happy path.** If trace saving fails, the conversation must still work. Wrap the trace mutation call in a try/catch inside `generate.ts`.
- **Lazy-load heavy data.** The inline badge uses the lightweight trace summary (already fetched for the conversation). The inspect panel shows scoring details from the same summary. The full trace (system prompt, messages array, raw response) is fetched on demand only when the user clicks "View full trace" inside the panel.
- **Link via messageId on the trace, not traceId on the message.** The `messages` table stays untouched. The trace stores a reference to the message it belongs to. This avoids schema changes to an existing table and keeps the trace system entirely additive.

---

## 2. Architecture

### Trace Capture Flow

```
User sends message
        |
        v
  send() mutation
        |
        v
  scheduler.runAfter(0, generate.respond)
        |
        v
  generate.respond() action
        |
   +----+------------------------------------------------------+
   |                                                            |
   |  1. Fetch messages + conversation + model                  |
   |  2. Build system prompt (capture: systemPrompt)            |
   |  3. Build messages array (capture: messagesArray)          |
   |  4. Record modelId, temperature, maxTokens                 |
   |                                                            |
   |  5. llmStart = Date.now()                                  |
   |  6. chatCompletion() → result                              |
   |     durationMs = Date.now() - llmStart                     |
   |     (capture: rawResponse, tokenUsage, durationMs)         |
   |                                                            |
   |  7. JSON.parse raw content (capture: rawScores)            |
   |  8. parseStructuredResponse() (capture: parsedResponse,    |
   |                                        sanitizedScores)    |
   |  9. computeScore() (capture: scoringResult)                |
   |                                                            |
   | 10. Decision branch → sets decisionType, calls save        |
   |     mutation, gets back messageId                          |
   |                                                            |
   | 11. saveTrace({ all captured data }) in try/catch          |
   |                                                            |
   +----+------------------------------------------------------+
        |
        v
  Trace stored in llmTraces table
```

### Debug UI Flow

```
ChatScreen (admin user)
        |
        v
  useQuery(getTraceSummariesForConversation)  ← one query per conversation
        |
        v
  Build messageId → TraceSummary lookup map
        |
        +---------------------------+
        |                           |
        v                           v
  MessageBubble                 DebugInspectPanel
  receives traceSummary         (right side panel,
        |                       renders when a message
        v                       is selected)
  DebugBadge                        |
  (inline, always visible)          +-- Scoring summary
  "FIRM → SKEPTICAL  47  elec."    |   (all 9 scores, threshold,
        |                           |    disengagement, duration, tokens)
        |  Click Hank bubble        |
        +----------+----------------+-- "View full trace" button
                   |                        |
                   v                        v
         ChatScreen sets               DebugTraceDetail
         inspectedMessageId            useQuery(getFullTrace)  ← lazy load
         → panel opens/swaps               |
                                            v
                                     System prompt, messages,
                                     raw response in scrollable <pre>
```

---

## 3. Schema: `llmTraces` Table

Add to `convex/schema.ts`:

```typescript
llmTraces: defineTable({
  // Links
  conversationId: v.id("conversations"),
  messageId: v.optional(v.id("messages")), // optional: error traces may have no message

  // Request
  systemPrompt: v.string(),           // full system prompt sent
  messagesArray: v.string(),          // JSON-stringified messages array sent to LLM
  modelId: v.string(),                // model identifier (e.g. "deepseek/deepseek-chat")
  temperature: v.number(),            // temperature param used
  maxTokens: v.number(),              // maxTokens param used

  // Response
  rawResponse: v.string(),            // raw LLM content string (before parsing)
  parsedResponse: v.string(),         // JSON-stringified StructuredResponse (after parseStructuredResponse)

  // Scores
  rawScores: v.string(),              // JSON-stringified raw scores from LLM (before sanitization)
  sanitizedScores: v.string(),        // JSON-stringified ExtractedScores (after sanitizeScores)
  scoringResult: v.string(),          // JSON-stringified ScoringResult { rawScore, score, stance, thresholdMultiplier }

  // Stance
  previousStance: v.string(),         // stance on the conversation before this turn
  newStance: v.string(),              // stance after scoring

  // Decision
  decisionType: v.string(),           // "normal" | "out-of-scope" | "concede" | "disengagement-increment" | "disengagement-denied" | "error"
  category: v.optional(v.string()),
  estimatedPrice: v.optional(v.number()),
  disengagementCount: v.number(),     // count at this turn (before any increment)

  // Metrics
  tokenUsage: v.object({
    promptTokens: v.number(),
    completionTokens: v.number(),
    totalTokens: v.number(),
  }),
  durationMs: v.number(),             // wall-clock ms for the LLM call

  // Error
  error: v.optional(v.string()),      // error message if the turn failed

  createdAt: v.number(),
})
  .index("by_conversation", ["conversationId", "createdAt"])
  .index("by_message", ["messageId"]),
```

**Why `v.string()` with JSON.stringify?** Convex supports `v.any()` but explicit string fields are safer — they survive schema validation, are predictable in size, and avoid accidental nested-object issues. The overlay parses them on the client. These fields are purely for display/debugging, not for querying.

**Why `messageId` is optional.** Error traces (when LLM returns garbage or parsing fails) may have no saved Hank message. These traces are valuable precisely because they show what went wrong.

### No changes to `messages` table

The `messages` schema stays exactly as-is. Trace-to-message linking is done via `messageId` on the trace, indexed with `by_message`. When the debug overlay needs the trace for a given message, it queries `llmTraces` by `messageId`.

---

## 4. Backend Changes

### 4.1 New file: `convex/llmTraces.ts`

Contains the internal mutation for saving traces and the queries for reading them.

```typescript
// convex/llmTraces.ts

// --- Internal (called by generate.ts action) ---

export const saveTrace = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    messageId: v.optional(v.id("messages")),
    systemPrompt: v.string(),
    messagesArray: v.string(),
    modelId: v.string(),
    temperature: v.number(),
    maxTokens: v.number(),
    rawResponse: v.string(),
    parsedResponse: v.string(),
    rawScores: v.string(),
    sanitizedScores: v.string(),
    scoringResult: v.string(),
    previousStance: v.string(),
    newStance: v.string(),
    decisionType: v.string(),
    category: v.optional(v.string()),
    estimatedPrice: v.optional(v.number()),
    disengagementCount: v.number(),
    tokenUsage: v.object({
      promptTokens: v.number(),
      completionTokens: v.number(),
      totalTokens: v.number(),
    }),
    durationMs: v.number(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("llmTraces", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

// --- Public queries (admin-only) ---

// Lightweight summary for debug overlay (excludes heavy fields)
export const getTraceSummariesForConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const traces = await ctx.db
      .query("llmTraces")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();
    return traces.map((t) => ({
      _id: t._id,
      messageId: t.messageId,
      previousStance: t.previousStance,
      newStance: t.newStance,
      sanitizedScores: t.sanitizedScores,
      scoringResult: t.scoringResult,
      category: t.category,
      estimatedPrice: t.estimatedPrice,
      disengagementCount: t.disengagementCount,
      decisionType: t.decisionType,
      durationMs: t.durationMs,
      tokenUsage: t.tokenUsage,
      error: t.error,
    }));
  },
});

// Full trace for "View full trace" expansion (lazy-loaded)
export const getFullTrace = query({
  args: { traceId: v.id("llmTraces") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.get(args.traceId);
  },
});
```

**Key design decisions:**
- `getTraceSummariesForConversation` fetches all traces for a conversation in one query. Efficient because conversations are short (3-8 turns). Excludes heavy fields (`systemPrompt`, `messagesArray`, `rawResponse`, `parsedResponse`, `rawScores`) to keep payload small.
- `getFullTrace` is called on-demand when the admin clicks "View full trace". Lazy-loads the heavy data.
- Both queries require `requireAdmin(ctx)`.

### 4.2 Modify: `convex/conversations.ts`

The three save mutations (`saveResponse`, `saveResponseWithScoring`, `saveResponseWithVerdict`) currently insert a message but don't return the message ID. The trace needs the `messageId` to link to.

**Change:** Each save mutation returns the `messageId` from `ctx.db.insert("messages", ...)`.

```typescript
// saveResponse handler — add return
handler: async (ctx, args) => {
  const messageId = await ctx.db.insert("messages", { ... });
  await ctx.db.patch(args.conversationId, { status: "active" });
  return messageId;
},
```

Same pattern for `saveResponseWithScoring` and `saveResponseWithVerdict`. Since these are `internalMutation` functions called only from `generate.ts`, there are no external callers to worry about.

### 4.3 Modify: `convex/llm/generate.ts`

The most significant backend change. The `respond` action must:

1. Capture timing (`Date.now()` before/after the LLM call)
2. Capture raw scores (before sanitization) separately from sanitized scores
3. Determine a `decisionType` string based on which code path executes
4. Capture the `messageId` returned by the save mutation
5. Call `internal.llmTraces.saveTrace` with all collected data in a try/catch

**Approach:** Collect all trace-relevant data into a `traceData` object as the function progresses. Call `saveTrace` once at the end of each branch. This keeps the branching logic clean.

```typescript
handler: async (ctx, args) => {
  const traceData: Record<string, unknown> = {};

  try {
    // ... existing steps 1-4 ...
    traceData.previousStance = currentStance;
    traceData.systemPrompt = systemPrompt;
    traceData.messagesArray = JSON.stringify(llmMessages);
    traceData.modelId = modelId;
    traceData.temperature = 0.8;
    traceData.maxTokens = 512;
    traceData.disengagementCount = disengagementCount;

    // 5. Call LLM with timing
    const llmStart = Date.now();
    const result = await chatCompletion({ ... });
    traceData.durationMs = Date.now() - llmStart;
    traceData.rawResponse = result.content;
    traceData.tokenUsage = result.usage;

    // 6. Capture raw scores before sanitization (Option A: extra JSON.parse)
    try {
      const rawParsed = JSON.parse(result.content);
      traceData.rawScores = JSON.stringify(rawParsed.scores ?? {});
    } catch {
      traceData.rawScores = "{}";
    }

    // 7. Parse structured response (sanitizes scores internally)
    const parsed = parseStructuredResponse(result.content);
    traceData.parsedResponse = JSON.stringify(parsed);
    traceData.sanitizedScores = JSON.stringify(parsed.scores);

    // 8-11. Decision branches — each sets decisionType, calls save, captures messageId
    // ... then at end of each branch:
    try {
      await ctx.runMutation(internal.llmTraces.saveTrace, { ...traceData });
    } catch (traceError) {
      console.error("Failed to save trace (non-fatal):", traceError);
    }

  } catch (error) {
    // Save error trace if we have enough data
    if (traceData.rawResponse) {
      traceData.error = String(error);
      traceData.decisionType = "error";
      try {
        await ctx.runMutation(internal.llmTraces.saveTrace, { ...traceData });
      } catch { /* non-fatal */ }
    }
    await ctx.runMutation(internal.conversations.setError, { ... });
  }
};
```

**Raw scores extraction.** Currently `parseStructuredResponse` calls `sanitizeScores` internally. To capture raw scores before sanitization, do one extra `JSON.parse` on the raw content just to extract `.scores`. This is redundant but clean — zero changes to `parseStructuredResponse`.

**Error trace handling.** If the LLM call succeeded but parsing/scoring failed, save an error trace (without messageId). If the error happened before the LLM call, skip the trace.

### 4.4 No changes to `convex/llm/openrouter.ts`

Already returns `{ content, model, usage }`. Timing is captured in `generate.ts` by wrapping the call with `Date.now()`. The hardcoded defaults (`temperature = 0.8`, `maxTokens = 512`) are recorded directly in the trace data.

---

## 5. Frontend Changes

### 5.1 New file: `src/types/trace.ts`

```typescript
// Lightweight trace summary (from getTraceSummariesForConversation)
export interface TraceSummary {
  _id: string;
  messageId?: string;
  previousStance: string;
  newStance: string;
  sanitizedScores: string;  // JSON string, parsed on render
  scoringResult: string;    // JSON string, parsed on render
  category?: string;
  estimatedPrice?: number;
  disengagementCount: number;
  decisionType: string;
  durationMs: number;
  tokenUsage: { promptTokens: number; completionTokens: number; totalTokens: number };
  error?: string;
}

// Full trace (from getFullTrace)
export interface FullTrace extends TraceSummary {
  conversationId: string;
  systemPrompt: string;
  messagesArray: string;
  modelId: string;
  temperature: number;
  maxTokens: number;
  rawResponse: string;
  parsedResponse: string;
  rawScores: string;
  createdAt: number;
}
```

### 5.2 New file: `src/components/DebugBadge.tsx`

Tiny inline badge rendered directly below each Hank message bubble. Always visible for admins — no interaction needed. Shows at-a-glance scoring info.

**Props:**
```typescript
interface DebugBadgeProps {
  traceSummary: TraceSummary;
  isInspected: boolean;   // highlight when this message's panel is open
  onClick: () => void;    // toggle inspect panel for this message
}
```

**Renders a single line like:**
```
FIRM → SKEPTICAL   47pts   electronics
```

**Styling rules:**
- `text-xs font-mono text-text-secondary` — barely there, doesn't compete with the message
- Stance colors: IMMOVABLE/FIRM → `text-denied`, SKEPTICAL → `text-text-secondary`, RELUCTANT/CONCEDE → `text-approved`
- Arrow (`→`) between previous and new stance
- `cursor-pointer` — clicking opens the inspect panel
- When `isInspected`, subtle highlight (e.g. `text-accent` or underline) to show which message the panel belongs to
- `mt-1` spacing below the bubble

### 5.3 New file: `src/components/DebugInspectPanel.tsx`

Slide-over panel fixed to the right side of the viewport. Shows full scoring detail for the currently inspected Hank message. Only one message at a time.

**Props:**
```typescript
interface DebugInspectPanelProps {
  traceSummary: TraceSummary;
  onClose: () => void;
}
```

**Layout:**
- Fixed position, right side, full viewport height
- Width: `w-[400px]` (or `w-96`)
- `bg-bg-surface border-l border-border shadow-lg`
- Header: message preview + close button (X)
- Scrollable content area

**Content sections:**
1. **Stance transition:** `FIRM → SKEPTICAL` with colored labels
2. **Score:** `47/100` prominent display
3. **Decision type:** `normal` | `out-of-scope` | `concede` | etc.
4. **Scores grid (3x3):** All 9 extracted scores with labels and values
5. **Metadata row:** Category, Price, Threshold multiplier
6. **Metrics row:** Disengagement count, Duration (ms), Token usage (prompt+completion=total)
7. **Error display:** If `traceSummary.error` exists, show in red
8. **"View full trace" button** → expands `DebugTraceDetail` below

**State:**
- `showFullTrace` (boolean) — controls full trace expansion. Default `false`.

**Overlay behavior:**
- Panel overlays on top of chat content (does not push/shrink the chat area)
- `z-50` to sit above chat messages
- Backdrop: optional subtle `bg-black/10` click-to-close overlay, or no backdrop (panel just floats)
- Animate in/out with CSS transition (`translate-x-full` → `translate-x-0`)

### 5.4 New file: `src/components/DebugTraceDetail.tsx`

Sub-component rendered inside `DebugInspectPanel` when the user clicks "View full trace". Separated because it makes its own Convex query and has independent loading state.

```typescript
interface DebugTraceDetailProps {
  traceId: string;
}
```

Renders scrollable `<pre>` blocks for: System Prompt, Messages Sent (pretty-printed JSON), Raw Response, Parsed Response, Raw Scores (pre-sanitization). Plus model/temp/maxTokens metadata.

**Styling:**
- Each section: label + `<pre>` block with `max-h-[300px] overflow-auto bg-bg rounded border border-border p-2 text-xs font-mono`
- `font-mono` throughout

### 5.5 Modify: `src/components/MessageBubble.tsx`

**New props:**
```typescript
interface MessageBubbleProps {
  message: Message;
  traceSummary?: TraceSummary | null;
  isAdmin?: boolean;
  isInspected?: boolean;
  onInspect?: () => void;
}
```

Two changes to the Hank message branch:

1. Make the Hank bubble clickable when admin (add `onClick={onInspect}` and `cursor-pointer` to the bubble div)
2. Render `<DebugBadge>` below the bubble if admin and trace exists

```tsx
{isAdmin && traceSummary && (
  <DebugBadge
    traceSummary={traceSummary}
    isInspected={isInspected ?? false}
    onClick={onInspect ?? (() => {})}
  />
)}
```

### 5.6 Modify: `src/components/ChatScreen.tsx`

1. Import `useUserAccess` to check admin status
2. Conditionally fetch trace summaries (only if admin)
3. Build `messageId → TraceSummary` lookup map via `useMemo`
4. Add `inspectedMessageId` state (which message's panel is open, or `null`)
5. Pass `traceSummary`, `isAdmin`, `isInspected`, `onInspect` to each `<MessageBubble>`
6. Render `<DebugInspectPanel>` when `inspectedMessageId` is set

```tsx
const { isAdmin } = useUserAccess();
const [inspectedMessageId, setInspectedMessageId] = useState<string | null>(null);

const traceSummaries = useQuery(
  api.llmTraces.getTraceSummariesForConversation,
  isAdmin && conversationId ? { conversationId } : "skip"
);

const traceByMessageId = useMemo(() => {
  if (!traceSummaries) return {};
  const map: Record<string, TraceSummary> = {};
  for (const t of traceSummaries) {
    if (t.messageId) map[t.messageId] = t;
  }
  return map;
}, [traceSummaries]);

// In JSX:
{messages.map((msg) => (
  <MessageBubble
    key={msg.id}
    message={msg}
    isAdmin={isAdmin}
    traceSummary={isAdmin ? (traceByMessageId[msg.id] ?? null) : undefined}
    isInspected={inspectedMessageId === msg.id}
    onInspect={() => setInspectedMessageId(
      inspectedMessageId === msg.id ? null : msg.id  // toggle
    )}
  />
))}

// After the messages container:
{isAdmin && inspectedMessageId && traceByMessageId[inspectedMessageId] && (
  <DebugInspectPanel
    traceSummary={traceByMessageId[inspectedMessageId]}
    onClose={() => setInspectedMessageId(null)}
  />
)}
```

### 5.7 Modify: `src/hooks/useConversation.ts`

Expose `conversationId` in the return value (one-line change):

```typescript
return { messages, isThinking, isError, send, reset, verdict, conversationId };
```

`conversationId` is already a state variable in the hook.

---

## 6. Debug UI Layout

### Chat Area (with inline badges)

```
+--------------------------------------------------------------+
|                                                              |
|  HANK                                                        |
|  ┌────────────────────────────────────────────────────────┐  |
|  │ That's a want, not a need. What happens if you don't   │  |
|  │ buy it?                                                │  |
|  └────────────────────────────────────────────────────────┘  |
|  FIRM → SKEPTICAL  47pts  electronics          ← badge      |
|                                                              |
|                     ┌──────────────────────────────────────┐ |
|                     │ I use my current laptop 8 hours a    │ |
|                     │ day and the screen is cracked.       │ |
|                     └──────────────────────────────────────┘ |
|                                                              |
|  HANK                                                        |
|  ┌────────────────────────────────────────────────────────┐  |
|  │ A cracked screen is cosmetic. Does it actually prevent │  |
|  │ you from working?                                      │  |
|  └────────────────────────────────────────────────────────┘  |
|  SKEPTICAL → RELUCTANT  72pts  electronics     ← badge      |
|                                                              |
+--------------------------------------------------------------+
```

### Inspect Panel (slides in from right on click)

```
+---------------------------------------+  +------------------+
|                                       |  | X  Inspect       |
|  Chat messages continue to render     |  |                  |
|  underneath the panel overlay.        |  | SKEPTICAL        |
|  The chat area is NOT resized.        |  |    → RELUCTANT   |
|                                       |  |                  |
|                                       |  | Score: 72/100    |
|                                       |  | Decision: normal |
|                                       |  |                  |
|                                       |  | ── Scores ────── |
|                                       |  | func_gap:    7   |
|                                       |  | cur_state:   8   |
|                                       |  | alts_owned:  3   |
|                                       |  | frequency:   7   |
|                                       |  | urgency:     4   |
|                                       |  | pattern:     3   |
|                                       |  | emotional:  -2   |
|                                       |  | specificity: 1.5 |
|                                       |  | consistency: 1.2 |
|                                       |  |                  |
|                                       |  | ── Meta ──────── |
|                                       |  | Cat: electronics |
|                                       |  | Price: $1,299    |
|                                       |  | Threshold: 1.30x |
|                                       |  | Disengage: 0     |
|                                       |  | Duration: 342ms  |
|                                       |  | Tokens: 127+89   |
|                                       |  |          = 216   |
|                                       |  |                  |
|                                       |  | [View full trace]|
|                                       |  |                  |
|                                       |  | (expanded below  |
|                                       |  |  when clicked:   |
|                                       |  |  system prompt,  |
|                                       |  |  messages sent,  |
|                                       |  |  raw response    |
|                                       |  |  in scrollable   |
|                                       |  |  <pre> blocks)   |
+---------------------------------------+  +------------------+
```

Non-admin users see only the message bubbles — no badges, no panel.

---

## 7. File List

| File | Action | Description |
|---|---|---|
| `convex/schema.ts` | MODIFY | Add `llmTraces` table definition |
| `convex/llmTraces.ts` | CREATE | `saveTrace` (internalMutation), `getTraceSummariesForConversation` (query), `getFullTrace` (query) |
| `convex/conversations.ts` | MODIFY | Return `messageId` from `saveResponse`, `saveResponseWithScoring`, `saveResponseWithVerdict` |
| `convex/llm/generate.ts` | MODIFY | Capture timing, raw scores, decision type; call `saveTrace` after each branch; handle error traces |
| `src/types/trace.ts` | CREATE | `TraceSummary` and `FullTrace` interfaces |
| `src/components/DebugBadge.tsx` | CREATE | Inline one-line badge below Hank messages (stance, score, category) |
| `src/components/DebugInspectPanel.tsx` | CREATE | Slide-over side panel with full scoring detail |
| `src/components/DebugTraceDetail.tsx` | CREATE | Full trace expansion with lazy-loaded data (inside inspect panel) |
| `src/components/MessageBubble.tsx` | MODIFY | Accept trace/admin/inspect props, render `DebugBadge`, make bubble clickable |
| `src/components/ChatScreen.tsx` | MODIFY | Fetch trace summaries, manage `inspectedMessageId` state, render `DebugInspectPanel` |
| `src/hooks/useConversation.ts` | MODIFY | Expose `conversationId` in return value |

---

## 8. Implementation Order

**Step 1: Schema + trace mutation (backend foundation)**
- Add `llmTraces` table to `convex/schema.ts`
- Create `convex/llmTraces.ts` with `saveTrace` internalMutation
- Modify `convex/conversations.ts` to return `messageId` from the three save mutations
- Deploy schema. Verify with `npx convex dev`.

**Step 2: Wire up generate.ts (trace capture)**
- Modify `convex/llm/generate.ts` to collect trace data and call `saveTrace`
- Test by sending a message and verifying a trace appears in the Convex dashboard
- Test error cases (malformed LLM response, etc.) to ensure traces are saved and conversations still work

**Step 3: Admin queries (backend read path)**
- Add `getTraceSummariesForConversation` and `getFullTrace` to `convex/llmTraces.ts`
- Test via Convex dashboard or a quick admin-only test

**Step 4: Frontend types + hook change**
- Create `src/types/trace.ts`
- Modify `useConversation.ts` to expose `conversationId`

**Step 5: Inline badge**
- Create `DebugBadge.tsx`
- Modify `MessageBubble.tsx` to accept trace/admin props and render the badge
- Modify `ChatScreen.tsx` to fetch traces and pass them down
- Verify badges appear below Hank messages for admin users

**Step 6: Inspect panel**
- Create `DebugInspectPanel.tsx` and `DebugTraceDetail.tsx`
- Add `inspectedMessageId` state to `ChatScreen.tsx`
- Wire click handlers (bubble click → open panel, X → close)
- Verify panel slides in/out, shows correct data, swaps on different message click

**Step 7: Polish and dark theme testing**
- Verify badge and panel render correctly in both light and dark themes
- Test panel slide animation
- Test lazy-loading of full trace inside panel
- Verify non-admin users see no debug UI
- Verify panel overlay doesn't cause layout shift in chat area

---

## 9. Verification Checklist

### Backend
- [ ] `llmTraces` table deploys without schema errors
- [ ] Sending a message creates a trace in the Convex dashboard
- [ ] Trace contains all expected fields (system prompt, scores, timing, etc.)
- [ ] Raw scores differ from sanitized scores when LLM returns out-of-range values
- [ ] Out-of-scope messages create traces with `decisionType: "out-of-scope"`
- [ ] Disengagement flow creates traces with correct `decisionType`
- [ ] CONCEDE stance creates traces with `decisionType: "concede"`
- [ ] If trace saving fails, the conversation still works normally
- [ ] Error traces (LLM failure, parse failure) are saved with `error` field
- [ ] `saveResponse`, `saveResponseWithScoring`, `saveResponseWithVerdict` all return `messageId`

### Frontend — Inline Badge
- [ ] Non-admin users see no badges or debug UI whatsoever
- [ ] Admin users see a one-line badge below each Hank message
- [ ] Badge shows stance transition (with arrow), score, and category
- [ ] Stance colors are correct (FIRM = red-ish, SKEPTICAL = gray, RELUCTANT = green-ish)
- [ ] Badge is clickable and opens the inspect panel
- [ ] Badge highlights when its message is currently inspected

### Frontend — Inspect Panel
- [ ] Clicking a Hank message/badge opens the inspect panel on the right
- [ ] Panel shows all 9 scores, threshold multiplier, category, price, disengagement, duration, tokens
- [ ] Clicking a different Hank message swaps the panel content
- [ ] Clicking the same message or X closes the panel
- [ ] Panel slides in/out with CSS transition (no jank)
- [ ] Panel overlays on top of chat — chat area does not resize
- [ ] "View full trace" button lazy-loads full trace data
- [ ] Full trace shows system prompt, messages sent, raw response in scrollable `<pre>` blocks

### Frontend — General
- [ ] Badge and panel render correctly in dark theme
- [ ] Trace summaries query only fires for admin users (check network tab)
- [ ] `conversationId` correctly exposed from `useConversation` hook
