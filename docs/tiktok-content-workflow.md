# TikTok Content Workflow

Turn real Hank conversations into short, punchy replay clips for TikTok/Reels.

## How It Works

Real conversations are 6-8 exchanges with multi-paragraph responses — too long for TikTok. The "Director's Cut" system lets you condense a conversation into a 3-4 exchange highlight reel, then auto-play it on a phone-optimized replay page for screen recording.

**No automated pipeline.** Claude Code is the editor. You review every cut before it goes live.

## Quick Start

### 1. Run the skill

```
/tiktok-cut
```

Claude Code lists your recent closed conversations:

```
1. Espresso machine ($800) — DENIED
2. Running shoes ($160) — APPROVED
3. Standing desk ($450) — DENIED
```

Pick one by number. Or pass a conversation ID directly:

```
/tiktok-cut jh72k4x9n0em...
```

### 2. Review the draft

Claude Code reads the full conversation, picks the best moments, and presents a condensed cut:

```
USER: "I want to buy a $800 espresso machine"
HANK: "You want to spend eight hundred dollars to avoid walking to a coffee shop?"
USER: "But I'd save money on lattes in the long run"
HANK: "The long run. Where purchases go to feel responsible."
-> DENIED
```

### 3. Iterate

Tell Claude Code what to change:

- "Make Hank's second line sharper"
- "Swap the comeback — use the one about quality"
- "Too long, cut to 3 exchanges"
- "Perfect, save it"

### 4. Get the replay URL

Once you approve, Claude Code saves the cut and gives you two URLs:

```
Replay URL: https://askhank.app/replay/<token>
Dev URL:    http://localhost:3000/replay/<token>
```

### 5. Record on phone

1. Open the replay URL on your phone
2. Start screen recording
3. The conversation auto-plays: messages appear one at a time with typing indicators, then the verdict card
4. Stop recording, trim, post

## Replay Page Behavior

- Full-viewport, dark mode, max-width 420px (phone-optimized)
- Item + price header at top
- Messages animate in one at a time (same animations as the real app)
- Typing indicator dots before each Hank message
- Verdict card scales in at the end
- "askhank.app" watermark at bottom
- Replay button appears when playback finishes
- No sign-in required — anyone with the URL can view it
- OG metadata for link previews (title: "Hank says NO to Espresso machine")

**Timing:** ~15-20 seconds total for 3-4 exchanges. User messages pause ~30ms/char (min 600ms), Hank messages ~35ms/char (min 800ms), typing indicator 1s, verdict holds 3s.

## Managing Cuts in Admin

Go to **Admin -> Content** tab to:

- **Browse** all existing cuts (item name, verdict badge, first message preview)
- **Expand** a cut to see all messages
- **Inline edit** — click any message to edit its text directly, hit Save
- **Copy URL** — copies the replay URL to clipboard
- **Delete** — removes the cut permanently

## Architecture

### Data

`replayCuts` table in Convex with fields:
- `conversationId` — links back to the source conversation
- `token` — UUID for the public URL (server-generated)
- `messages` — condensed message array `[{role, content}]`
- `item`, `estimatedPrice`, `category`, `verdict`, `verdictSummary` — denormalized from the conversation so the replay page needs only one unauthenticated query

### Security

- Creating/editing/deleting cuts requires admin auth
- The `/tiktok-cut` skill uses internal Convex functions (bypasses Clerk since CLI has no browser auth)
- The replay page (`getByToken`) is the only public query — returns only display data, no internal IDs
- Token is validated against UUID/alphanumeric format before querying

### Key Files

| File | Purpose |
|---|---|
| `.claude/commands/tiktok-cut.md` | The `/tiktok-cut` skill definition |
| `convex/replayCuts.ts` | CRUD functions + internal CLI functions |
| `convex/schema.ts` | `replayCuts` table definition |
| `src/app/replay/[token]/page.tsx` | Server component with OG metadata |
| `src/app/replay/[token]/ReplayPageClient.tsx` | Client component that fetches + renders |
| `src/components/ReplayScreen.tsx` | Auto-playing state machine component |
| `src/components/admin/ContentManager.tsx` | Admin tab for managing cuts |
