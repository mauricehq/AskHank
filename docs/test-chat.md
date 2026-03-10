# testChat — CLI conversation runner

Run full multi-turn conversations with Hank from the terminal. Returns Hank's response and the complete scoring trace in one shot.

## Quick start

```bash
# New conversation
npx convex run llm/testChat:testChat '{"message": "I want a $800 Samsung TV"}'

# Continue (use the conversationId from the previous output)
npx convex run llm/testChat:testChat '{"conversationId": "<id>", "message": "My current one is broken"}'
```

## Args

| Arg | Type | Required | Description |
|-----|------|----------|-------------|
| `message` | string | yes | The user message to send to Hank |
| `conversationId` | Id | no | Omit to start a new conversation. Provide to continue an existing one. |

## Return shape

```jsonc
{
  "conversationId": "abc123...",   // reuse this for follow-up turns
  "response": "Hank's reply text",
  "trace": [                       // one entry per turn in the conversation
    {
      "turn": 1,
      "userMessage": "I want a $800 Samsung TV",
      "hankResponse": "...",
      "stance": "FIRM → FIRM",
      "decisionType": "normal",
      "score": 22,
      "rawScore": 22,
      "estimatedPrice": 800,
      "category": "electronics",
      "assessment": { "intent": "want", "urgency": "none", ... },
      "mappedScores": { "intentScore": 0, "currentSolutionScore": 0, ... },
      "toolArgs": { "is_non_answer": false, "has_new_information": true, ... },
      "tokens": 1200,
      "durationMs": 3400
    }
  ]
}
```

## Multi-turn example

```bash
# Turn 1 — start
npx convex run llm/testChat:testChat '{"message": "I want to buy a $300 standing desk"}'
# Note the conversationId in the output

# Turn 2 — justify
npx convex run llm/testChat:testChat '{"conversationId": "<id>", "message": "My back hurts from sitting 10 hours a day and my doctor recommended it"}'

# Turn 3 — push harder
npx convex run llm/testChat:testChat '{"conversationId": "<id>", "message": "I already tried a laptop riser and ergonomic chair, neither helped"}'
```

## What to look for in the trace

- **stance**: Shows progression (e.g. `FIRM → SKEPTICAL`). Should only move one step at a time.
- **score / rawScore**: Raw is before price/positioning modifiers. Compare to see modifier impact.
- **priceModifier / positioningModifier**: Values < 1 make it harder to concede (expensive items).
- **decisionType**: `normal`, `disengagement-*`, `stagnation-*`, `out-of-scope`, `casual`, or `error`.
- **assessment**: The LLM's read on intent, urgency, specificity, etc.
- **mappedScores**: How each assessment enum maps to a numeric score.

## Requirements

- At least one user with `role: "admin"` must exist in the database (testChat uses the first admin it finds).
- `npx convex dev` must be running (or deploy to a dev environment).

## How it works

`testChat` is an `internalAction` — not callable from the client. It:
1. Finds the first admin user (for the userId requirement)
2. Creates a conversation (or reuses the provided one)
3. Inserts the user message
4. Calls `respond` directly (awaited, not scheduled — so you get the result immediately)
5. Reads the full trace via `debugDump`
6. Returns everything in one object
