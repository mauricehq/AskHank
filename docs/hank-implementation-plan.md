# Hank — Implementation Plan

## Architecture Decision

**Next.js (not React Native for Web) for the web app.** The app is shipping web-first. Next.js is the known stack, ships faster, and the UI is simple enough that porting to React Native later is trivial. Convex handles the entire backend.

```
┌─────────────────┐     ┌─────────────────────────────────┐
│                  │     │            Convex                │
│   Next.js App    │────►│                                 │
│   (Vercel)       │     │  Auth (Google OAuth)            │
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
                        │  Claude Haiku /      │
                        │  GPT-4o-mini         │
                        └─────────────────────┘
```

---

## Phase 0: Project Setup ✅

**Goal:** Empty project that builds and deploys.

- [x] Init Next.js project in D:\code\AskHank
- [x] Init Convex, connect to project
- [ ] Deploy to Vercel (empty shell, confirms pipeline works)
- [x] Set up environment variables (Convex URL, LLM API key)
- [x] Basic layout component (app shell, nothing else)

**Time:** A few hours. No product code. Just plumbing.

---

## Phase 1: Auth

**Goal:** User can sign in with Google and has an identity in Convex.

- [ ] Set up Convex Auth with Google OAuth + Email/Password
- [ ] Sign-in screen (minimal — logo, "Sign in with Google" button, email/password form, one-liner about Hank)
- [ ] Auth guard — nothing loads without signing in
- [ ] User record in Convex (ID, email, created date)
- [ ] Long-running tab support — session must survive background tabs, sleep, hours of inactivity. Silent token refresh, no surprise sign-outs, no lost conversation state. User comes back to exactly where they left off.

**Why first:** Everything depends on identity. Credits, history, memory, saved total — all tied to a user. Can't build anything without this.

**Time:** 1 day.

---

## Phase 2: Hank's Voice (The Core)

**Goal:** A working conversation with Hank. This is the make-or-break phase. If the voice doesn't land, nothing else matters.

### 2a: LLM Integration
- [ ] Convex action that calls Claude Haiku (or GPT-4o-mini)
- [ ] System prompt v1 — Hank's personality, voice rules, all 7 non-negotiable rules from the spec
- [ ] Basic request/response: send user message → get Hank's response
- [ ] Structured output: Hank's text response + JSON scores per factor (functional gap, current state, alternatives, frequency, urgency, pattern history, emotional reasoning, specificity, consistency)

### 2b: Scoring Engine
- [ ] Convex function: takes structured scores, computes weighted total, returns stance
- [ ] Stance enum: IMMOVABLE / FIRM / SKEPTICAL / RELUCTANT / CONCEDE
- [ ] Stance fed back into next LLM call as context: "Your current stance is: FIRM. Do not concede."
- [ ] Disengagement detection: two consecutive non-answers → case closure (denied)

### 2c: Conversation UI
- [ ] Chat screen — message list + text input
- [ ] User messages and Hank's responses rendered as chat bubbles
- [ ] Scrolls to latest message
- [ ] Loading/typing indicator while Hank is "thinking"
- [ ] Verdict display at conversation end (denied/approved)
- [ ] New conversation button

### 2d: Voice Tuning
- [ ] Test 20-30 real conversations with different purchase scenarios
- [ ] Tune system prompt based on where Hank is too soft or too harsh
- [ ] Verify scoring engine produces correct stances
- [ ] Test disengagement flow (one-word answers, "I want it" on repeat)
- [ ] Test concession flow (genuinely justified purchases)
- [ ] Adjust weights if concession rate is outside 10-15% target

**This phase is where you spend the most time.** Not on code — on the prompt. The system prompt IS the product. Iterate until Hank sounds right.

**Time:** 3-5 days (mostly prompt tuning, not code).

---

## Phase 3: Persistence

**Goal:** Conversations are saved. Hank remembers. The "saved $X" counter works.

### 3a: Conversation Storage
- [ ] Convex schema: conversations table (userId, item, category, messages[], scores[], verdict, amount, createdAt, summary)
- [ ] Each conversation stored as it happens (messages added in real-time)
- [ ] Verdict saved when conversation closes (denied/approved/abandoned)
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

### 5a: Micro-interactions (Framer Motion)
- [ ] Message appear animation (Hank's responses slide/fade in)
- [ ] Typing indicator animation
- [ ] Verdict reveal (denied = firm, approved = reluctant acknowledgment)
- [ ] "Saved $X" counter tick-up animation
- [ ] Screen transitions
- [ ] Button press feedback

### 5b: Share
- [ ] Share button on completed conversations
- [ ] Generates a share card (image) with the conversation highlight
- [ ] Optimized for Instagram Stories / TikTok
- [ ] Include app name/URL on the card

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

- [ ] Convex schema: dossier document per user (owns[], context{}, weaknesses[], track_record{})
- [ ] After each conversation, LLM extracts new facts (items owned, life details, condition updates)
- [ ] Convex function merges new facts into existing dossier — updates, never duplicates
- [ ] Inject dossier as YAML into system prompt alongside conversation summaries (~500 tokens)
- [ ] Dossier feeds into scoring engine — alternatives owned becomes real data, not guessing
- [ ] Total memory overhead: ~2,000 tokens (dossier + summaries + stance). Cheap.
- [ ] User never fills out a profile — Hank learns by listening

See hank-scoring-engine.md for full dossier design and YAML format.

**Time:** 2-3 days.

---

## Phase 8: iOS (Deferred)

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

| Phase | Time | What |
|-------|------|------|
| 0: Setup | Hours | Project scaffolding |
| 1: Auth | 1 day | Google OAuth + Email/Password |
| 2: Hank's Voice | 3-5 days | LLM, scoring engine, chat UI, prompt tuning |
| 3: Persistence | 2-3 days | History, saved counter, memory (summaries) |
| 4: Credits + Stripe | 2-3 days | Credit system, payments |
| 5: Polish + Share | 2-3 days | Animations, share cards, landing content |
| 6: Launch Prep | 1-2 days | Legal, domain, content prep |
| **Total** | **~2-3 weeks** | **Web app live, TikTok engine running** |
| 7: User Dossier | 2-3 days | v1.5 — post-launch, needs user data first |
| 8: iOS | 1-2 weeks | Only if web proves traction |

Phase 2 is where you should spend the most time. The voice is the product. Everything else is a container.

---

## What to Mock During Development

- **LLM responses** — mock Hank's replies while building UI. Only use real API calls when tuning the voice (Phase 2d).
- **Stripe** — use Stripe test mode throughout. Switch to live when launching.
- **Scoring engine** — can hardcode stances while building conversation UI, then wire up real scoring.

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

- Supabase auth code (Convex Auth is different)
- Database types/schema (Supabase-specific)
- Beer-specific business logic
- Tailwind colors (Hank has his own palette)
- Dashboard.tsx (114KB monolith)
- Subscription tier logic (Hank uses credits, not subscriptions)

---

## Open Questions Remaining

1. **App name / domain** — "Hank" as the app? "Ask Hank"? Need a URL.
2. ~~**Photo input in web v1?**~~ **Yes — proven.** Already built camera-based scanning for Hopshelf (Google Gemini Flash). Same approach for Hank.
3. **System prompt** — needs its own design doc. The most important deliverable.
4. **Credit reset timezone** — UTC or user's timezone? UTC is simpler.
5. **Conversation memory scope** — how many past conversations to inject as context? All of them gets expensive. Last 10? Last 30 days?
