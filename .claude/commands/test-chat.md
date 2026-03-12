Run a multi-turn conversation with Hank from the terminal using `testChat`.

## Input

`$ARGUMENTS` format: `<message>` or `<conversationId> <message>`

- If the first token looks like a Convex ID (long alphanumeric string), treat it as a `conversationId` and the rest as the message (continuing an existing conversation).
- Otherwise, treat the entire input as the message (starting a new conversation).

If no arguments provided, ask the user what they want to say to Hank.

## Steps

1. **Parse arguments** from `$ARGUMENTS` as described above.

2. **Run testChat** via Bash:
   - New conversation:
     ```
     npx convex run llm/testChat:testChat '{"message": "<message>"}'
     ```
   - Continue existing:
     ```
     npx convex run llm/testChat:testChat '{"conversationId": "<id>", "message": "<message>"}'
     ```
   Properly escape the message for JSON (handle quotes, newlines, etc.).

3. **Present the results**:

   ### Hank's Response
   Show the full response text.

   ### Conversation ID
   Show the `conversationId` so the user can continue with `/test-chat <id> <next message>`.

   ### Trace (Latest Turn)
   For the most recent turn only, show:
   - Stance transition (e.g. `FIRM → SKEPTICAL`)
   - Decision type
   - Score (raw → final, with modifier breakdown if modifiers != 1)
   - Key assessment fields: intent, urgency, specificity, consistency
   - Boolean flags (`is_non_answer`, `has_new_information`, `user_backed_down`) — only when `true`

   ### Score History
   If multi-turn, show a compact score progression across all turns:
   ```
   Turn 1: 22 (FIRM → FIRM)
   Turn 2: 48 (FIRM → SKEPTICAL)
   Turn 3: 71 (SKEPTICAL → LEANING)
   ```

4. **Remind the user** how to continue:
   ```
   Continue: /test-chat <conversationId> <next message>
   Full trace: /trace <conversationId>
   ```
