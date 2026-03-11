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
- [x] Pure scoring function (`convex/llm/scoring.ts`): weighted factors, price/category modifiers, stance thresholds
- [x] Stance enum: IMMOVABLE / FIRM / SKEPTICAL / RELUCTANT / CONCEDE
- [x] Dynamic stance fed into each LLM call: "Your current stance is X. [stance-specific instructions]"
- [x] One LLM call per turn — returns both response + scores as JSON (halves cost vs two-call approach)
- [x] Disengagement detection: two consecutive non-answers → case closure (denied)
- [x] Verdict system: conversations close with "approved" (CONCEDE stance) or "denied" (disengagement)
- [x] VerdictCard wired to real data (was mocked in 2c)

**Key design:** Stance comes from the PREVIOUS turn's scoring. First turn defaults to FIRM. The one-turn delay is invisible — first response is always pushback.

### 2d: Voice Tuning
- [ ] Test 20-30 real conversations with different purchase scenarios
- [ ] Tune system prompt based on where Hank is too soft or too harsh
- [ ] Verify scoring engine produces correct stances
- [ ] Test disengagement flow (one-word answers, "I want it" on repeat)
- [ ] Test concession flow (genuinely justified purchases)
- [ ] Adjust weights if concession rate is outside 10-15% target

### 2e: Anti-Patterns + Signature Move Tracking

**Borrowed from Hopshelf's Tyler system.** Tyler has a 690-line style guide, explicit anti-patterns, and signature move frequency control that prevents repetitive responses. Hank needs the same guardrails.

#### Anti-Patterns (add to system prompt)

Explicit "NEVER sound like this" examples that prevent LLM drift into generic AI territory:
- [ ] Add anti-pattern section to `convex/llm/prompt.ts`
- "Let's think about this purchase holistically..." (self-help bot)
- "I understand how you feel..." (sympathetic enabler)
- "You're an adult, your choice" (defeatist — violates Rule 2)
- "Based on my analysis of consumer spending patterns..." (data nerd)
- "That's nice but maybe not right now?" (soft no)
- "You should really think about your financial habits..." (lecturer)
- "Okay but like, that IS a pretty cool thing though..." (buddy enabler)

**Reference:** `Hopshelf/docs/advisor/BARTENDER_STYLE_GUIDE.md` — Tyler's anti-patterns section. Same pattern, different character.

#### Signature Move Types

Define Hank's recurring move types so we can track and rotate them:

| Move | What | Example |
|------|------|---------|
| **The Math** | Puts a number on it | "That's rent money in some cities." |
| **The Callback** | References what they own | "You already own three of these." |
| **The Deflation** | Punctures the want | "You just want the aesthetic." |
| **The Pattern Call** | Notes repetition | "That's the third time you've said 'I want it'." |
| **The Reframe** | Renames the purchase | "You're paying for a badge, not a car." |
| **The Contradiction** | Uses their words against them | "You said you needed to save. Two impulse purchases ago." |

#### Frequency Control

- [ ] Add `extractRecentMoves()` — regex scan of last 2 Hank messages to detect which move types were used
- [ ] Inject `RECENT MOVES (vary your approach): Turn 2: the math. Turn 4: the callback. Try a different pattern or none at all.` into system prompt
- [ ] Not every message needs a signature move — sometimes Hank just says no

**Reference:** `Hopshelf/lib/advisor/prompts.ts` — Tyler's `extractRecentMoves()` and RECENT MOVES injection pattern. Same mechanism, different move types.

**Day 30 Test (from Hopshelf):** Every Hank line must feel good on the 30th read. Signature moves at 1-in-3 frequency max. No gimmicks that age poorly.

**This phase is where you spend the most time.** Not on code — on the prompt. The system prompt IS the product. Iterate until Hank sounds right.

**Time:** 3-5 days (mostly prompt tuning, not code).

---

## Phase 3: Persistence

**Goal:** Conversations are saved. Hank remembers. The "saved $X" counter works.

### 3a: Conversation Storage (partially done)
- [x] Convex schema: conversations table (userId, status, stance, score, category, estimatedPrice, disengagementCount, verdict, createdAt)
- [x] Separate messages table (conversationId, role, content, createdAt) — messages stored in real-time
- [x] Verdict saved when conversation closes (approved/denied)
- [ ] On close: generate one-line summary (pre-computed, not on-the-fly) — item, price, verdict, strongest claim, key quote

### 3b: Conversation History
- [ ] History screen — chronological list of past conversations
- [ ] Each entry: item name, date, verdict (denied/approved), amount saved
- [ ] Tap to revisit full conversation (read-only)

### 3c: "Saved $X" Counter
- [ ] Running total stored per user in Convex
- [ ] Incremented when a conversation closes as denied and user provided an estimated price
- [ ] Displayed prominently on main screen
- [ ] Hank asks for estimated price if user doesn't provide it

### 3d: Hank's Memory (Conversation Summaries)
- [ ] Query last 20-30 conversation summaries for the user before each new conversation
- [ ] Inject as structured YAML into system prompt (not JSON — YAML parses cleaner for LLM context, lesson from Hopshelf)
- [ ] ~30-40 tokens per summary, ~1,000 tokens total for 30 conversations. Cheap.
- [ ] Summary format per conversation: date, item, price, verdict, claim, key quote, context
- [ ] LLM does the connecting — spots patterns, references past quotes, calls out repeat behavior
- [ ] Category tracking: how many times user asked about similar items
- [ ] Quote tracking: Hank throws the user's own words back at them

### ~~3e: User Dossier~~ → Deferred to v1.5
Retention feature, not a launch feature. At launch there are zero conversations to build a dossier from. It gets valuable after 10-15 conversations per user — that's weeks of usage. Build it when early users have enough history for it to matter. See hank-scoring-engine.md for full dossier design.

**Time:** 2-3 days.

---

## Phase 4: Credits + Payments

**Goal:** Free tier works. Paid credits purchasable via Stripe.

### 4a: Credit System
- [ ] Convex schema: credits table (userId, freeCreditsRemaining, purchasedCredits, lastFreeReset)
- [ ] 3 free credits per day, reset at midnight (user's timezone or UTC — decide)
- [ ] 1 credit = 1 conversation
- [ ] Credit check before conversation starts
- [ ] "Out of credits" state with purchase CTA

### 4b: Stripe Integration
- [ ] Stripe Checkout for credit pack purchases
- [ ] Credit packs: 10 for $0.99, 30 for $1.99, 75 for $3.99
- [ ] Convex HTTP action as Stripe webhook handler
- [ ] Webhook receives payment confirmation → adds credits to user
- [ ] Credits screen/modal showing balance + purchase options

**Time:** 2-3 days.

---

## Phase 5: Polish + Share

**Goal:** The app feels good and produces shareable content.

### 5a: Micro-interactions ✅ (done in 2c-5, CSS keyframes)
- [x] Message appear animation (Hank's responses slide/fade in)
- [x] Typing indicator animation
- [x] Verdict reveal (denied = firm, approved = reluctant acknowledgment)
- [ ] "Saved $X" counter tick-up animation (needs Phase 3c first)
- [x] Screen transitions
- [x] Button press feedback

### 5b: Share (Verdict Card + Roast Card)

**Borrowed from Hopshelf's shareable card system.** Hopshelf generates OG images via Puppeteer with public token-based URLs, two-step download (generate → save), and `navigator.share()` with clipboard fallback. Same infrastructure, adapted for conversation moments.

#### Verdict Card (primary — build first)
- [ ] Add `shareToken` field to conversations table (generated on verdict)
- [ ] Public route: `/verdict/[token]` — displays verdict with OG metadata
- [ ] OG image generation (1200x630 for social unfurl, 1080x1350 for download)
- [ ] Card content: item, price, verdict (DENIED/APPROVED), Hank's closing quote, stance progression
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
| 2: Hank's Voice | ✅ 2c/2a/2b done, 2d/2e remaining | Chat UI, LLM, scoring, anti-patterns, signature moves |
| 3: Persistence | Partial (3a storage done) | History UI, saved counter, memory |
| 4: Credits + Stripe | Not started | Credit system, payments |
| 5: Polish + Share | ✅ 5a done | Verdict card, roast card, landing content |
| 6: Launch Prep | Not started | Legal, domain, content prep |
| 7: User Dossier | Not started | v1.5 — post-launch, needs user data first |
| 8: Banger System | Not started | v2 — post-dossier, engineers screenshot-worthy moments |
| 9: iOS | Not started | Only if web proves traction |

Phase 2 is where you should spend the most time. The voice is the product. Everything else is a container.

The path to bangers: **2e** (signature moves) → **5b** (shareable cards) → **7** (dossier) → **8** (banger system). Each phase builds on the last. Signature moves teach Hank variety. Cards make moments shareable. The dossier gives Hank memory. Bangers engineer the moments worth sharing.

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
- **After launch:** Are people hitting the 3 credit limit? That's the signal to double down. If nobody runs out of free credits, usage is too low.

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
4. **Credit reset timezone** — UTC or user's timezone? UTC is simpler.
5. **Conversation memory scope** — how many past conversations to inject as context? All of them gets expensive. Last 10? Last 30 days?
