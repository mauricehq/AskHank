Inspect LLM traces for an AskHank conversation.

## Input

`$ARGUMENTS` format: `<conversationId> [optional focus direction]`

- First token: the Convex conversation ID (required)
- Remaining text: optional focus (e.g. "why did stagnation fire", "check contradicting", "score drop on turn 4")

If no arguments provided, ask the user for a conversation ID.

## Steps

1. **Parse arguments**: Extract conversation ID (first token) and optional focus direction (remaining text) from `$ARGUMENTS`.

2. **Fetch traces**: Run via Bash:
   ```
   npx convex run llmTraces:debugDump '{"conversationId": "<id>"}'
   ```
   If this errors (invalid ID, no data), show the error clearly and stop.

3. **Analyze the JSON output** and present:

   ### Summary
   - Item being discussed, category, estimated price
   - Total turns
   - Final outcome: last stance, last decision type (this is the verdict)
   - Score trajectory: list scores per turn, note the trend

   ### Turn-by-Turn Breakdown
   For each turn, show:
   - Turn number
   - User message (truncated if long) → Hank response (truncated if long)
   - Stance transition (e.g. `firm → softening`)
   - Decision type
   - Score and raw score
   - Key assessment changes from previous turn (what changed and why it matters)
   - Coalescing overrides if any were applied
   - Boolean flags: `is_non_answer`, `has_new_information`, `user_backed_down`, `is_out_of_scope` — only mention when `true`

   ### Anomalies
   Flag anything unusual:
   - Score crashes (drops of 15+ points between turns)
   - Unexpected decision types given the score
   - Stagnation or disengagement counter jumps (check `stagnationCount`/`disengagementCount` fields in the trace data — these aren't in debugDump output directly, so note if coalescing overrides mention them)
   - Coalescing overrides that changed the outcome
   - Assessment fields that seem wrong (e.g. `urgency: "critical"` for a luxury item)

4. **If focus direction was given**, zoom into that aspect with extra detail. For example:
   - "check stagnation" → show all stagnation-related coalescing overrides and counter progression
   - "score drop" → deep-dive into the turns where score decreased, comparing assessments
   - "why concede" → trace the path to concession through stance changes and score thresholds

5. **Reference source files** when explaining behavior:
   - `convex/llm/scoring.ts` — score computation, stance thresholds, multiplier tables
   - `convex/llm/generate.ts` — `executeGetStance` branch logic (branches 1-8), coalescing
   - `convex/llm/prompt.ts` — assessment field descriptions, tool definition

   Read these files as needed to explain *why* something happened, not just *what* happened.
