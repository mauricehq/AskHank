# Hank — Implementation Plan

## Architecture Decision

**Next.js (not React Native for Web) for the web app.** The app is shipping web-first. Next.js is the known stack, ships faster, and the UI is simple enough that porting to React Native later is trivial. Convex handles the entire backend.

```
┌─────────────────┐     ┌─────────────────────────────────┐
│                  │     │            Convex                │
│   Next.js App    │────►│                                 │
│   (Vercel)       │     │  Auth (Clerk, Google OAuth)     │
│                  │     │  Database (conversations,       │
│  - Chat UI       │     │    credits, saved total)        │
│  - History       │     │  Scoring Engine (function)      │
│  - Credits       │     │  LLM Proxy (action)            │
│  - Landing page  │     │  Stripe webhook handler         │
│                  │     │                                 │
└─────────────────┘     └──────────┬──────────────────────┘
                                   │
                                   ▼
                        ┌─────────────────────┐
                        │  DeepSeek / any model│
                        │  via OpenRouter      │
                        └─────────────────────┘
```

---

## Phase 0: Project Setup ✅

**Goal:** Empty project that builds and deploys.

- [x] Init Next.js project in D:\code\AskHank
- [x] Init Convex, connect to project
- [x] Deploy to Vercel (pipeline confirmed working)
- [x] Set up environment variables (Convex URL, LLM API key)
- [x] Basic layout component (app shell, nothing else)

**Time:** A few hours. No product code. Just plumbing.

---

## Phase 1: Auth ✅

**Goal:** User can sign in with Google and has an identity in Convex.

- [x] Set up Clerk auth with Google OAuth + Email/Password
- [x] Sign-in/sign-up modals (on-brand — burnt orange accent, DM Sans, AskHank tokens via Clerk appearance prop)
- [x] Auth guard — proxy.ts protects all routes except `/`, page uses `<Show>` components
- [x] User record in Convex (tokenIdentifier, email, displayName, updatedAt)
- [x] Long-running tab support — Clerk handles session persistence natively (short-lived JWTs auto-refresh, 7-day session cookie, ConvexProviderWithClerk passes fresh tokens automatically)

**Decisions made:**
- Clerk (not Convex Auth beta) for production stability. Keyless mode for fast dev start.
- `displayName` asked in-app (Phase 2 onboarding), not from Clerk's sign-up form — preserves user's preferred casing.
- "Store user on first auth" pattern via `useStoreUserEffect` hook — simpler than webhooks.
- `_creationTime` (Convex built-in) used instead of custom `createdAt`.

**Why first:** Everything depends on identity. Credits, history, memory, saved total — all tied to a user. Can't build anything without this.

**Time:** 1 day.

---

## Phase 2: Hank's Voice (The Core)

**Goal:** A working conversation with Hank. This is the make-or-break phase. If the voice doesn't land, nothing else matters.

**Execution order: UI first (2c → 2a → 2b → 2d).** Build the chat UI against mock data so when LLM integration starts, voice tuning happens in the real UI — testing both simultaneously. No wasted iterations.

**Extras built during Phase 2:**
- Admin panel with role management (normal/insider/admin) and app settings (model selection)
- Dark theme toggle with next-themes
- Convex security hardening (requireUser/requireAdmin auth checks on all public functions)

### 2c: Conversation UI (FIRST)

Broken into 5 increments. See `docs/chat-ui-spec.md` for full chat UI specification.

#### 2c-1: App Shell & Sidebar ✅
- [x] Flex layout: sidebar (280px) + chat area (remaining, centered 720px max)
- [x] Sidebar: history list, "New conversation" button, collapse toggle, user area at bottom
- [x] Collapsible sidebar on desktop (280px ↔ 0px, toggle button)
- [x] Mobile: top bar (hamburger + logo + credits badge), sidebar as overlay drawer (280px)
- [x] Responsive breakpoint at 768px (md)

#### 2c-2: Chat Messages & Input ✅
- [x] Message bubbles: Hank (left-aligned, white, border+shadow, "HANK" label) and user (right-aligned, orange)
- [x] Auto-resize textarea input bar (min 40/44px, max 200px desktop / 30vh mobile)
- [x] Send button (Enter on desktop, button on mobile), camera button placeholder (disabled)
- [x] Scroll-to-bottom behavior (sentinel div + smooth scroll on message change)
- [x] Mock data: 5-message espresso machine conversation for visual testing
- [x] EmptyState → ChatScreen toggle via "Talk to Hank" button
- [x] "New conversation" in sidebar resets to EmptyState

#### 2c-3: Onboarding ✅
- [x] "What should Hank call you?" prompt for new users (no displayName set)
- [x] Sets displayName via existing mutation, shown once

#### 2c-4: Empty State, Typing Indicator, Verdict ✅
- [x] Empty state copy refined (dry tone, no question marks)
- [x] Typing indicator (three CSS-animated dots in Hank-bubble styling)
- [x] Verdict card at conversation end (denied/approved, Share disabled, New conversation button)
- [x] Mock typing flow: user sends → 1.5s delay → Hank responds, verdict after 3rd message
- [x] Input bar disabled during typing, hidden post-verdict

#### 2c-5: Animations (after 2c-4) ✅
- [x] CSS keyframes + Tailwind transitions (replaced Framer Motion to reduce bundle size)
- [x] Message appear (slide/fade), sidebar toggle, drawer slide
- [x] Verdict reveal animation
- [x] Typing indicator pulse
- [x] Button press feedback

### 2a: LLM Integration ✅
- [x] Convex action that calls LLM via OpenRouter (model configurable via admin panel, default DeepSeek)
- [x] System prompt v1 — Hank's personality, voice rules, all 7 non-negotiable rules from the spec
- [x] Basic request/response: send user message → get Hank's response
- [x] Structured JSON output: Hank's text response + scores per factor (functional gap, current state, alternatives, frequency, urgency, pattern history, emotional reasoning, specificity, consistency)

**Decisions made:**
- OpenRouter as LLM proxy (model-agnostic, easy to swap models via admin panel)
- `ctx.scheduler.runAfter(0)` pattern for async LLM calls — user sees "thinking" state immediately
- Admin panel controls model selection + app settings

### 2b: Scoring Engine ✅

**v3 debate-based scoring** (`convex/llm/scoring.ts`, `convex/llm/generate.ts`).

**Architecture — 2-call per turn:**
```
Call 1: [full system prompt] + messages + tool → assessment (tool_choice: required)
Call 2: [selected prompt]   + messages + tool call + tool result → Hank's response
```
Call 1 forces the LLM to call `get_stance` with structured assessment fields. The scoring engine (`executeGetStance`) processes the assessment server-side and returns stance + guidance as the tool result. Call 2 generates Hank's response using that guidance.

**Scoring mechanics:**
- [x] Turn delta system: each turn computes a score delta based on assessment booleans (challenge_addressed, evidence_provided, new_angle, emotional_reasoning)
- [x] Running score accumulates across turns; stance is derived from score thresholds
- [x] Price modifier scales thresholds (expensive items are harder to justify)
- [x] Stance guardrails prevent jumping more than one level per turn
- [x] Intent-based starting scores: "replace" starts higher than "want"
- [x] Stance enum: IMMOVABLE / FIRM / SKEPTICAL / RELUCTANT / CONCEDE

**Closing conditions:**
- [x] Disengagement: 2 consecutive non-answers → denied
- [x] Stagnation: 3 consecutive zero-delta turns → denied
- [x] Collapse: score drops below -5 after turn 3 → denied
- [x] User backed down: user agrees they shouldn't buy → denied
- [x] Concede: score crosses threshold → approved

**Closing brief system** (`buildClosingBrief`): extracts winning argument and weakest moment from turn summaries, enriches the tool result guidance so closing lines reference specific conversation details.

**Persisted context:** Each turn saves a `PersistedContext` (item, price, category, intent, turn summaries) as JSON in `lastAssessment`. Context coalescing carries forward stable fields across turns.

**Key design:** Stance comes from the scoring engine, not the LLM. The LLM classifies the argument quality; the engine decides the stance. The LLM follows the stance it's given.

### 2d: Voice Tuning ✅
- [x] Test 20-30 real conversations with different purchase scenarios
- [x] Tune system prompt based on where Hank is too soft or too harsh
- [x] Verify scoring engine produces correct stances
- [x] Test disengagement flow (one-word answers, "I want it" on repeat)
- [x] Test concession flow (genuinely justified purchases)
- [x] Adjust weights if concession rate is outside 10-15% target

### 2e: Anti-Patterns + Signature Move Tracking ✅

#### Anti-Patterns ✅
- [x] `NEVER sound like this` section in `buildSystemPrompt()` with 13 anti-examples covering: too formal, too aggressive, too soft, sympathetic enabler, defeatist, lecturer, buddy enabler, commiserator, life coach

#### Signature Move Types ✅
- [x] Six move types defined in `convex/llm/moves.ts`: The Math, The Callback, The Deflation, The Pattern Call, The Reframe, The Contradiction
- [x] `extractRecentMoves()` — regex scan of last 2 Hank messages to detect which move types were used
- [x] `buildRecentMovesSection()` injects `RECENT MOVES` into system prompt when moves are detected, tells LLM to vary approach

### 2f: Dedicated Opener & Closer Prompts ✅

The v1 approach (injecting OPENING LINE / CLOSING LINES sections into the shared system prompt) didn't work — the LLM ignores focused guidance competing with 2500+ tokens of generic instructions.

**Fix:** Dedicated system prompts for Call 2 on turn 1 (opener) and closing turns (closer). Same 2-call architecture, zero additional latency.

```
Call 2 prompt selection:
  closing turn with verdict  → buildCloserPrompt()  (~500 tokens, verdict-specific rules)
  turn 1, normal scoring     → buildOpenerPrompt()   (~400 tokens, item-specific opener)
  all other turns            → buildSystemPrompt()    (full prompt, unchanged)
```

- [x] `buildOpenerPrompt()` — focused prompt with good/bad opener examples, forces item-specific observation over generic probes
- [x] `buildCloserPrompt()` — verdict-branched prompt (concession rules vs denial rules), forces mic-drop closings that reference specific arguments
- [x] Prompt selection guards: closer always takes priority; opener only fires for normal scoring turns (not out-of-scope, non-answer, or directed-question on turn 1)
- [x] All examples unquoted across all prompts to prevent quote-wrapping cascade through conversation history

### 2g: LLM Trace Infrastructure ✅

- [x] `llmTraces` table: full request/response capture per turn (system prompt, messages, tool args, tool result, scoring, stance transitions, token usage, duration)
- [x] `debugDump` internal query: human-readable turn-by-turn trace with assessment, scoring, user/hank messages, persisted context
- [x] `call2SystemPrompt` field: captures which prompt Call 2 used (opener/closer/null for full prompt) for debugging prompt swaps
- [x] Trace viewer via `/trace` slash command for conversation-level inspection

**This phase is where you spend the most time.** Not on code — on the prompt. The system prompt IS the product. Iterate until Hank sounds right.

---

## Phase 3: Persistence

**Goal:** Conversations are saved. Hank remembers. The "saved $X" counter works.

### 3a: Conversation Storage (partially done)
- [x] Convex schema: conversations table (userId, status, stance, score, category, estimatedPrice, disengagementCount, verdict, createdAt)
- [x] Separate messages table (conversationId, role, content, createdAt) — messages stored in real-time
- [x] Verdict saved when conversation closes (approved/denied)
- [x] On close: save card data (excuse + verdict tagline) — generated via forced `closing_response` tool call on Call 2 closing turns. Structured JSON extraction (closing_line, excuse, verdict_tagline) with fallback to plain content. Fields saved to conversation doc as `excuse` and `verdictTagline`.

### 3b: Conversation History ✅
- [x] Sidebar history list via `listForUser` — chronological, tap to revisit full conversation
- [x] Loading skeleton + empty state
- [x] Delete conversation
- [x] Enhance history entries: show item name, verdict badge (denied/approved), price — instead of generic title

### 3c: "Saved $X" Counter ✅
- [x] Running total stored per user in Convex (`savedTotal` + `deniedCount` fields on users table)
- [x] Incremented when a conversation closes as denied and user provided an estimated price (conditional increment in `saveResponseWithVerdict`)
- [x] Displayed prominently on main screen (two-stat card in sidebar: `$saved` + `skipped`)
- [x] Hank asks for estimated price if user doesn't provide it (system prompt instructs LLM to ask early)

### 3d: Hank's Memory ✅

**Original plan called for injecting 20-30 conversation summaries. Actual implementation is a targeted memory nudge system — lighter, cheaper, and more effective because Hank references ONE specific past conversation instead of drowning in context.**

#### Memory Nudge System ✅
- [x] Query past conversations for the user (`internalGetPastConversations`)
- [x] `selectMemoryNudge()` picks ONE past conversation to reference — filters to same category, valid item, not "other"; sorts by lowest reference count then most recent
- [x] `formatNudgePrompt()` injects structured YAML into system prompt (previous_item, price, date, their_claim)
- [x] Nudge fires on turn 2+ during stance softening, persists across all subsequent turns
- [x] `memoryReferenceCount` tracking — rotates which past conversation gets referenced so Hank doesn't repeat
- [x] Timezone-aware relative dates ("a few days ago", "last week") using calendar-day boundaries in user's local time

#### Category History ✅
- [x] Count same-category conversations within 90-day window (additive to nudge — doesn't change which conversation is picked)
- [x] `categoryHistory` on `MemoryNudge`: count, category, window label ("a couple weeks", "a couple months")
- [x] Only included when count > 1 — no noise for first-time category visitors
- [x] `formatNudgePrompt()` appends `category_history` YAML block when present
- [x] Window labels use `daysToWindowLabel()` / `formatWindowLabel()` — distinct from point-in-time "ago" labels

#### Not built (deferred to dossier in Phase 7)
- [ ] Quote tracking: Hank throws the user's own words back at them — needs richer per-conversation data than what memory nudges store

### 3e: Work-Hours Reframe ✅

**The insight:** Telling someone a standing desk costs $350 is abstract. Telling them it costs 12.5 hours of their labor is visceral. Price-to-hours conversion is one of the most effective impulse killers — validated by Reddit users who built entire apps around this single mechanic.

**How it works:**
- [x] Optional salary/hourly rate input (onboarding + settings — annual salary or hourly rate)
- [x] Stored on user record in Convex (`incomeAmount`, `incomeType` on users table — never shared, never displayed publicly)
- [x] After-tax estimation: flat 25% effective tax rate, annual → hourly via 2080 hours/year
- [x] When Hank knows the price and the user's rate, inject `work_hours:` YAML block into system prompt (after PRICE CONTEXT)
- [x] Hank weaves it into the conversation naturally: "That's 12 hours of your life for a gadget you'll forget about."
- [x] Anti-parroting directive: use once max, don't lead with it, never say their rate out loud

**Implementation details:**
- Pure computation in `convex/llm/workHours.ts` (no Convex imports) — `computeWorkHours()` + `formatWorkHoursBlock()`
- Injected into `buildSystemPrompt()` (turn 2+) and `buildOpenerPrompt()` (turn 1 when price known)
- Work hours recomputed after Call 1 scoring to avoid one-turn lag when price changes mid-conversation
- `setIncome` / `clearIncome` mutations with auth checks, positive amount validation
- Onboarding: segmented toggle (Annual Salary / Hourly Rate) + dollar input below name field, optional
- Settings: inline-edit row between Display Name and Email, with "Remove income" link

**Prompt injection format:**
```yaml
work_hours:
  hourly_rate_net: 23.44
  hours_equivalent: 21.3
Use this ONCE max per conversation. Don't lead with it. Never say their rate out loud. Narrate in your voice — e.g. "That's 12 hours of your life for a gadget you'll forget about."
```

### ~~3f: User Dossier~~ → Deferred to v1.5
Retention feature, not a launch feature. At launch there are zero conversations to build a dossier from. It gets valuable after 10-15 conversations per user — that's weeks of usage. Build it when early users have enough history for it to matter. See hank-scoring-engine.md for full dossier design.

**Time:** 2-3 days.

---

## Phase 4: Credits + Payments

**Goal:** Free tier works. Paid credits purchasable via Stripe.

**See `docs/monetization.md` for full credit system design, cost analysis, and margin calculations.**

### 4a: Credit System
- [ ] Convex schema: credits table (userId, balance, totalPurchased, totalUsed)
- [ ] 1 credit = 1 user message (3 credits for photo messages)
- [ ] New users receive 30 free messages (starter pack, no daily reset)
- [ ] Credit check on message send, not conversation start
- [ ] "Out of credits" state with purchase CTA (mid-conversation friendly)

### 4b: Stripe Integration
- [ ] Stripe Checkout for credit pack purchases
- [ ] Credit packs: 50 for $1.99, 150 for $4.99, 400 for $9.99
- [ ] Convex HTTP action as Stripe webhook handler
- [ ] Webhook receives payment confirmation → adds credits to balance
- [ ] Credits screen/modal showing balance + purchase options

### 4c: Cost Controls
- [ ] Sliding context window after turn 8 (first message + last 6 messages) to cap per-message LLM cost
- [ ] Per-message cost tracking for analytics (actual tokens used per call)

**Time:** 2-3 days.

---

## Phase 5: Polish + Share

**Goal:** The app feels good and produces shareable content.

### 5a: Micro-interactions ✅ (done in 2c-5, CSS keyframes)
- [x] Message appear animation (Hank's responses slide/fade in)
- [x] Typing indicator animation
- [x] Verdict reveal (denied = firm, approved = reluctant acknowledgment)
- [ ] "Saved $X" counter tick-up animation
- [x] Screen transitions
- [x] Button press feedback

### 5b: Share (Verdict Card + Roast Card)

**Borrowed from Hopshelf's shareable card system.** Hopshelf generates OG images via Puppeteer with public token-based URLs, two-step download (generate → save), and `navigator.share()` with clipboard fallback. Same infrastructure, adapted for conversation moments.

#### Verdict Card (primary — build first)

Adapted from Hopshelf's card layout. Dark card, punchy content, screenshot-ready.

```
AskHank                        DENIED

FRIDGE
$1,000 • Furniture

───

   "My wife doesn't like it"

   Expensive avoidance.

askhank.app                  Hank says no
```

**Card fields:**
| Field | Source |
|-------|--------|
| DENIED/APPROVED | `verdict` — orange badge for approved, muted for denied |
| Item name (big) | `item` from closing context |
| Price + category | `estimatedPrice`, `category` |
| Excuse | User's core argument — punchy, under 10 words, in quotes |
| Verdict tagline | Hank-voice 2-4 word summary (e.g. "Expensive avoidance") |

**Excuse + verdict tagline generation:** Extracted via forced `closing_response` tool call on Call 2 closing turns. `buildClosingToolDefinition()` defines three required fields (closing_line, excuse, verdict_tagline). No additional LLM call — same 2-call architecture. Fallback: if tool call fails, closing line falls back to `call2.content`, card fields are null.

Hank's closing line (e.g. "the cheapest therapy session you'll ever have") can optionally replace or sit alongside the verdict tagline, depending on which hits harder.

**Implementation:**
- [ ] Add `shareToken` field to conversations table (generated on verdict)
- [x] Add `excuse` and `verdictTagline` fields — generated by `closing_response` tool call on closing turns, saved with verdict
- [ ] Public route: `/verdict/[token]` — displays card with OG metadata
- [ ] OG image generation (1200x630 for social unfurl, 1080x1350 for download)
- [ ] Share modal: copy link (desktop) / native share (mobile) + download PNG

#### Roast Card (secondary — highest virality potential)
- [ ] Extract best Hank quote per conversation (sharpest/funniest line, not always the closing line)
- [ ] Store as `bestQuote` on conversation when verdict is issued
- [ ] Public route: `/roast/[token]` — single devastating quote with item + verdict
- [ ] Optimized for vertical format (1080x1350) — Instagram Stories / TikTok friendly
- [ ] Include app URL on every card as CTA

#### Share UX
- [ ] Enable the currently-disabled Share button on VerdictCard
- [ ] Two options: "Share Verdict" (full context) and "Share Roast" (single quote)
- [ ] Two-step download flow (generate image on first tap, save on second — iOS Safari safe)
- [ ] `navigator.share()` on mobile with clipboard fallback on desktop

**Reference:** `Hopshelf/components/share/ShareCardModal.tsx` — generic share pattern with iOS Safari safe download handling.

### 5c: Landing Content
- [ ] Marketing section on the same site (root page or above-the-fold before sign-in)
- [ ] One-liner: "Tell Hank what you want to buy. He says no."
- [ ] Screenshot/mockup of a real conversation
- [ ] Sign-in CTA
- [ ] "Hank has saved users $X" (later, when there's data)

**Time:** 2-3 days.

---

## Phase 6: Launch Prep

**Goal:** Everything needed to go live and start the TikTok engine.

- [ ] Privacy Policy page (required, can be simple)
- [ ] Terms of Service page (required, can be simple)
- [ ] Custom domain (need to pick one — askhank.com? meethank.com? TBD)
- [ ] OG meta tags + social card (when someone shares the URL)
- [ ] Error handling + edge cases (API failures, rate limits, Stripe issues)
- [ ] Mobile-responsive design (people coming from TikTok are on phones)
- [ ] Record 3-5 TikToks before launch day
- [ ] Have 2 weeks of content ideas ready

**Time:** 1-2 days.

---

## Phase 7: User Dossier (v1.5 — Post-Launch)

Only when early users have 10-15+ conversations. The dossier needs data to be useful.

**Borrowed from Hopshelf's `computeDossier()` pattern.** Tyler injects ~200 tokens of compact YAML into every prompt — top styles, streaks, blind spots, pace. Hank's dossier is the same idea for purchase behavior.

### 7a: Purchase History Schema
- [ ] Ensure conversation summaries capture: item, category, price, verdict, strongest claim, key quote
- [ ] Track per-user aggregates: total attempts, resistance rate (% denied), top categories, avg price
- [ ] Log outcomes: what argument worked, when user backed down, what they said

### 7b: Dossier Builder (pure function)
- [ ] `computeHankDossier(conversations, user)` — takes history, outputs dossier
- [ ] Tier system (from Hopshelf): cold_start (0-2 attempts, no patterns), observer (3-9, emerging patterns), full (10+, complete dossier with callbacks)
- [ ] Convex schema: dossier document per user (owns[], context{}, weaknesses[], track_record{})
- [ ] After each conversation, LLM extracts new facts (items owned, life details, condition updates)
- [ ] Convex function merges new facts into existing dossier — updates, never duplicates

### 7c: Dossier Injection
- [ ] Format as compact YAML (~200 tokens), inject into system prompt as `YOUR KNOWLEDGE OF THIS BUYER:`
- [ ] Dossier feeds into scoring engine — alternatives owned becomes real data, not guessing
- [ ] Total memory overhead: ~2,000 tokens (dossier + summaries + stance). Cheap.
- [ ] User never fills out a profile — Hank learns by listening

Example dossier (full tier):
```yaml
basics:
  regular_since: "January 2026"
  attempted_purchases: 14
  hank_wins: 12 (86%)
  recent_streak: "4 rejections in a row"
patterns:
  top_categories: "Tech Gadgets (5), Home Decor (4), Fashion (3)"
  weak_points: "FOMO purchases, anything for the dog"
  resistance_score: 8/10
recent:
  last_attempt: "Air fryer ($89) — Denied 3d ago"
  what_worked: "Counted existing appliances, asked where you'd put it"
callbacks:
  - "Said 'never another gadget' on Jan 15 — now on gadget #5"
  - "Bought headphones after backing down last time"
```

**Reference:** `Hopshelf/lib/advisor/dossier.ts` — `computeDossier()` with tier-aware sections and YAML formatting. `Hopshelf/lib/advisor/prompts.ts` — injection pattern.

See hank-scoring-engine.md for full dossier design and YAML format.

**Time:** 2-3 days.

---

## Phase 8: Banger System (v2 — Post-Dossier)

**Borrowed from Hopshelf's `advisorBanger.ts`.** Tyler has a mic-drop system that fires max once per session when data warrants it. 11 trigger detectors across 3 tiers, scored with a threshold gate. Hank needs the same — moments where a single line crystallizes the case against buying.

**Requires:** Phase 7 (dossier) for cross-conversation triggers. Some triggers work within a single conversation and could ship earlier.

### 8a: Trigger Detectors

**Tier 1 (+2 points each) — fire alone in blunt mode:**

| Trigger | Pattern | Tone |
|---------|---------|------|
| `emotionalReasoningOnly` | Zero functional arguments, all FOMO/status/desire/boredom | `authority_drop` |
| `cyclicalPurchaser` | History shows repeat impulse pattern in same category (needs dossier) | `emotional_hook` |
| `alternativeAvailable` | User owns working equivalent, can't articulate why this is better | `authority_drop` |
| `impulseExposed` | User didn't mention this item before today, now it's urgent | `cinematic_line` |

**Tier 2 (+1 point each):**

| Trigger | Pattern | Tone |
|---------|---------|------|
| `untestedAlternatives` | Hasn't tried cheaper/free options, convinced they won't work | `subtle_roast` |
| `vagueUseCase` | Can't articulate how often or why they'd use it | `authority_drop` |
| `priceRationalized` | Mentioned price concern, then talked themselves out of it | `cinematic_line` |
| `contradictionCaught` | Walked back a previous strong claim (consistency = contradicting) | `subtle_roast` |

**Tier 3 (+1 point each):**

| Trigger | Pattern | Tone |
|---------|---------|------|
| `firstConversation` | No prior history with this user | `emotional_hook` |
| `budgetPressure` | Mentioned savings goals or money concerns in passing | `emotional_hook` |
| `repeatCategory` | Third+ attempt in the same category (needs dossier) | `subtle_roast` |

### 8b: Scoring Gate

```
threshold = 3 (normal) or 2 (blunt mode, if added later)
score = sum of fired triggers (Tier 1 = +2, Tier 2/3 = +1)
fire if: score >= threshold AND no banger fired this conversation
```

Max one banger per conversation. Scarcity creates weight — when Hank fires one, it lands harder because it's rare.

### 8c: Tone Directions

```
authority_drop:    "close the case — the purchase doesn't hold water"
subtle_roast:      "needle the rationalization — the humor is in the observation"
cinematic_line:    "pause the momentum — shift from buying energy to reflecting energy"
emotional_hook:    "make it personal — connect the doubt to something felt, not measured"
```

### 8d: Implementation

- [ ] `convex/llm/hankBanger.ts` — trigger detectors + scoring gate + tone selection
- [ ] Input: current assessment, previous assessment, conversation history, user dossier (if available)
- [ ] Output: `{ fire: boolean, tone?: string, direction?: string, triggers?: string[] }`
- [ ] Inject into system prompt when fired: `BANGER MOMENT: [tone direction]. 2-8 words max. Do NOT force it — if your response doesn't naturally lead to a closer, skip it.`
- [ ] Track `lastBangerTurn` in conversation state to enforce once-per-conversation gate
- [ ] LLM has escape hatch — can decline if the direction doesn't fit naturally

**Reference:** `Hopshelf/lib/advisor/advisorBanger.ts` — full trigger/scoring/tone system. `Hopshelf/lib/advisor/openCardMoment.ts` — additional moment detection patterns.

**Why this matters for shareability:** Banger lines are the lines people screenshot. "You're shopping for confidence, not a product." "You know how this ends. Don't repeat it." The banger system engineers these moments instead of hoping the LLM produces them.

**Time:** 2-3 days.

---

## Phase 9: iOS (Deferred)

Only if web proves traction. Not before.

- [ ] Apple Developer Account ($99/year)
- [ ] Port UI to React Native (Expo) — same Convex backend
- [ ] Replace Framer Motion with Reanimated/Moti
- [ ] Add Apple IAP for credit packs
- [ ] Add push notifications (expo-notifications)
- [ ] EAS Build + App Store submission
- [ ] Privacy Policy + Terms of Service (already done for web)

**Time:** 1-2 weeks.

---

## Total Timeline (Web Launch)

| Phase | Status | What |
|-------|--------|------|
| 0: Setup | ✅ Done | Project scaffolding |
| 1: Auth | ✅ Done | Clerk auth (Google + Email/Password) |
| 2: Hank's Voice | ✅ Done (2a-2g) | Chat UI, LLM, v3 scoring, voice tuned, anti-patterns, signature moves, dedicated opener/closer prompts, trace infrastructure |
| 3: Persistence | ✅ Done (3a-3e) | Storage, history, saved counter, memory, work-hours reframe |
| 4: Credits + Stripe | Not started | Credit system, payments |
| 5: Polish + Share | ✅ 5a done | Verdict card, roast card, landing content |
| 6: Launch Prep | Not started | Legal, domain, content prep |
| 7: User Dossier | Not started | v1.5 — post-launch, needs user data first |
| 8: Banger System | Not started | v2 — post-dossier, engineers screenshot-worthy moments |
| 9: iOS | Not started | Only if web proves traction |

Phase 2 is where you should spend the most time. The voice is the product. Everything else is a container.

The path to bangers: ~~**2e** (signature moves)~~ ✅ → **5b** (shareable cards) → **7** (dossier) → **8** (banger system). Signature moves are live. Cards make moments shareable. The dossier gives Hank memory. Bangers engineer the moments worth sharing.

---

## What to Mock During Development

- ~~**LLM responses** — mock Hank's replies while building UI.~~ ✅ Real LLM calls wired up.
- **Stripe** — use Stripe test mode throughout. Switch to live when launching.
- ~~**Scoring engine** — can hardcode stances while building conversation UI.~~ ✅ Real scoring engine wired up.

---

## Risk Checkpoints

After each phase, ask:

- **After Phase 2:** Does Hank sound right? Is the voice screenshot-worthy? If not, keep tuning. Don't move on until the voice lands.
- **After Phase 4:** Full product works end-to-end. Test with wife + friends. Get honest feedback.
- **After Phase 5:** Record a test TikTok. Is the conversation entertaining in 15 seconds? If not, the content format needs rethinking.
- **After launch:** Are people running out of starter credits? What's the median conversation length? Are users buying credit packs? These are the signals to tune pricing.

---

## Reusable from Hopshelf (D:\code\Hopshelf)

Hopshelf is a goldmine. ~3-5 days of development saved.

### Copy Directly

**Stripe (Phase 4)**
| File | What | Adaptation |
|------|------|------------|
| `lib/stripe/server.ts` | Stripe server singleton, lazy init | None — copy as-is |
| `lib/stripe/client.ts` | Stripe client singleton | None — copy as-is |
| `lib/subscription/config.ts` | Pricing config, `formatPrice()` | Adapt tiers → credit packs |
| `app/api/stripe/webhook/route.ts` | Webhook handler — idempotency, signature verification, audit logging | Change `subscription` → `payment` mode, swap Supabase → Convex mutations |
| `app/api/stripe/checkout/route.ts` | Checkout session creation | Change mode to `payment`, update metadata for credit packs |

**LLM Client (Phase 2)**
| File | What | Adaptation |
|------|------|------------|
| `lib/openrouter/client.ts` | 1,171 lines — streaming, SSE parsing, tool call accumulation, fallback models, rate limit handling | Core client reusable. Adapt tool definitions for Hank's scoring extraction |
| `lib/openrouter/models.ts` | Model config (IDs, token limits, capabilities) | Update model list for Hank's needs |
| `lib/scan/parseResponse.ts` | JSON extraction from vision model responses, handles reasoning model preamble | Reuse for photo input parsing |
| `lib/scan/prompt.ts` | Vision prompt structure (multimodal message construction) | Adapt prompt for item identification instead of beer labels |

**Project Scaffolding (Phase 0)**
| File | What | Adaptation |
|------|------|------------|
| `tsconfig.json` | Strict TS, `@/*` path alias, ES2022 | None — copy as-is |
| `postcss.config.js` | PostCSS + autoprefixer | None — copy as-is |
| `next.config.js` | Minimal Next.js config | None — copy as-is |
| `.gitignore` | Standard Next.js ignores | None — copy as-is |
| `vitest.config.ts` | Test setup with path aliases | None — copy as-is |

### Reuse the Pattern, Rebuild the Code

**Auth Session Management (Phase 1)**
Supabase code won't port to Convex, but the session patterns in `lib/context/AuthContext.tsx` are exactly what we need for long-running tab support:
- Visibility change detection with 5-minute debounce
- Window focus listener for cross-tab sync
- Retry with exponential backoff (3 attempts, 1s/2s/3s)
- Timeout wrapping (5s safety timeout on all auth operations)
- Transient vs permanent error distinction
- `sessionError` state with user-facing banner + "Sign In Again" CTA
- Refs to prevent race conditions in async effects

**Chat UI (Phase 2c)**
`components/AdvisorChat.tsx` is 39KB — too Hopshelf-specific to copy, but the patterns inside are portable:
- Message rendering with markdown (bold text in accent color)
- Typing indicator with staggered animated dots
- Auto-resizing textarea (min 44px, max 30vh mobile / 200px desktop)
- Scroll-to-bottom button
- Error handling with retry countdown
- Usage/credits indicator in chat footer

**System Prompt Architecture (Phase 2a)**
Tyler's prompt structure in `lib/advisor/prompts.ts` maps directly to Hank:
- Identity block + mode (Tyler dry/blunt → Hank's personality)
- YAML dossier injection (already proven, already our pattern)
- Voice examples with labeled move types
- Anti-examples (what NOT to say) — critical for preventing sycophancy
- Recent moves tracking to prevent repetitive responses
- Tier-based prompt dispatch (cold start vs full context)

**Share Functionality (Phase 5)**
`components/share/ShareCardModal.tsx` — generic share pattern:
- Two-step flow: generate card → download/share
- iOS Safari safe download handling
- `navigator.share()` with clipboard fallback
- Portal-based modal overlay

### Don't Reuse

- Supabase auth code (using Clerk + Convex instead)
- Database types/schema (Supabase-specific)
- Beer-specific business logic
- Tailwind colors (Hank has his own palette)
- Dashboard.tsx (114KB monolith)
- Subscription tier logic (Hank uses credits, not subscriptions)

---

## Open Questions Remaining

1. ~~**App name / domain**~~ — AskHank / askhank.app.
2. ~~**Photo input in web v1?**~~ **Yes — proven.** Already built camera-based scanning for Hopshelf (Google Gemini Flash). Same approach for Hank.
3. ~~**System prompt**~~ — Done. Lives in `convex/llm/prompt.ts`. Dynamic stance, JSON output, scoring guidelines.
4. ~~**Credit reset timezone**~~ — No longer relevant. Starter pack model has no daily reset.
5. ~~**Conversation memory scope**~~ — Resolved: memory nudge system picks ONE past conversation per session (same category, rotated by reference count). Category history counts same-category conversations within 90 days. Full conversation summaries deferred to dossier (Phase 7).
