Create a TikTok-ready "director's cut" from a real Hank conversation.

## Input

`$ARGUMENTS` — optional conversationId. If not provided, list recent conversations for the user to pick from.

## Steps

### 1. Get the conversation

**If no conversationId provided:**

Run via Bash:
```
npx convex run replayCuts:internalListConversations '{}'
```

Filter to only `"closed"` conversations with a verdict. Show them as a numbered list:
```
1. Espresso machine ($800) — DENIED
2. Running shoes ($160) — APPROVED
3. Standing desk ($450) — DENIED
```

Ask the user to pick one by number.

**If conversationId provided (or after user picks):**

Fetch all messages:
```
npx convex run replayCuts:internalGetMessages '{"conversationId": "<id>"}'
```

Also fetch the conversation list for metadata if needed:
```
npx convex run replayCuts:internalListConversations '{}'
```
(Find the matching conversation in the results.)

### 2. Craft the director's cut

Read all messages and identify the best moments. Condense into 3-4 exchanges:

- **Hook**: The user's ask — punchy, relatable, 1-2 sentences
- **Challenge**: Hank's sharpest line — preserve verbatim if already good
- **Comeback** (optional): User's best counter
- **Payoff**: Hank's closer or verdict moment

Rules:
- Each message: 1-2 sentences, under 120 characters
- Preserve Hank's actual best lines verbatim when they're already sharp
- Cut filler, pleasantries, repetition
- The cut should feel like a highlight reel, not a summary
- Must feel natural as a conversation, not choppy

Present the draft to the user formatted like:
```
USER: "I want to buy a $800 espresso machine"
HANK: "You want to spend eight hundred dollars to avoid walking to a coffee shop?"
USER: "But I'd save money on lattes in the long run"
HANK: "The long run. Where purchases go to feel responsible."
→ DENIED
```

### 3. Iterate

Wait for the user's feedback. They might say:
- "Make Hank's second line sharper"
- "Swap the comeback for something about quality"
- "Too long, cut to 3 exchanges"
- "Perfect, save it"

Update and re-present until they approve.

### 4. Save the cut

When the user says it's good, save it. The server generates the token automatically and returns it:

```
npx convex run replayCuts:internalCreate '{"conversationId": "<id>", "messages": [{"role": "user", "content": "..."}, {"role": "hank", "content": "..."}]}'
```

The return value is the generated token (a UUID string). Use it for the replay URL.

### 5. Output the replay URL

```
Replay URL: https://askhank.app/replay/<token>
Dev URL: http://localhost:3000/replay/<token>
```

Tell the user they can:
- Open the URL on their phone
- Screen record while it auto-plays
- Edit messages later in Admin → Content tab
