# Hank — Requirements

## Overview

Hank is an AI-powered impulse purchase prevention app. You tell it what you want to buy. It says no. You argue. It holds firm — unless you make a genuinely strong case across multiple dimensions. The personality is the product.

---

## Platform

**Web first, then iOS.**

- **Web app** — Next.js, hosted on Vercel. Primary platform for launch. TikTok link-in-bio goes straight here. Zero friction.
- **iOS** — React Native (Expo), ships after web is validated. Port of the web UI, same Convex backend. Expo Go for testing, EAS Build for App Store submission (no Mac required).
- Separate codebases for web and iOS. Shared backend. UI is simple enough that porting is trivial.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| App (web) | Next.js | Web app — primary launch platform |
| App (iOS) | React Native (Expo) | Native iOS — ships after web is validated |
| Backend | Convex | Auth, database, functions, LLM proxy, scoring engine |
| AI | Claude Haiku / GPT-4o-mini | Conversation + vision (photo input) |
| Payments (web) | Stripe | Credit packs on web (97% kept) |
| Payments (iOS) | Apple In-App Purchase | Credit packs on iOS (70% kept after Apple's 30%) |
| Hosting | Vercel | Web app + landing page |

No separate API server. No Express. No infra to manage. Convex is the server.

---

## Authentication

- **Google OAuth + Email/Password** via Convex Auth
- Google: one tap sign-in, zero friction
- Email/Password: for users who don't want Google
- Required before first use — no anonymous access
- Protects API from abuse, ties credits/history/savings to account
- No profile, no username, no settings screen in v1. Sign in and go.
- **Long-running tab support** — sessions must survive background tabs, sleep, and extended inactivity. Silent token refresh, no surprise sign-outs, no lost conversation state mid-argument.

---

## Core Features

### 1. Conversation Screen

The main (and primary) screen. A chat interface with Hank.

**Input:**
- Text input — type what you want to buy
- Photo input — snap or upload a photo of the item (camera + photo library)
- Optional: estimated price (for the "saved $X" counter)

**Output:**
- Hank's response — in character, attacking the weakest factor
- Back-and-forth conversation — 3-5 exchanges typical
- Final verdict — denied or approved, delivered by Hank

**Behavior:**
- New conversation starts with what the user wants to buy
- Hank responds with a "no" and cross-examines
- Each user reply is scored by the scoring engine (see hank-scoring-engine.md)
- Scoring engine returns stance → LLM follows the stance
- Conversation ends via verdict (approved/denied) or case closure (disengagement)

### 2. Scoring Engine

A Convex function. No LLM. Deterministic.

**Input:** Structured scores extracted by the LLM per exchange:
- Functional gap (0-10)
- Current state (0-10)
- Alternatives owned (0-10)
- Frequency of use (0-10)
- Urgency (0-10)
- Pattern history (0-10)
- Emotional reasoning (0 to -10)
- Specificity multiplier (0.3-1.5)
- Consistency multiplier (0.0-1.2)

**Output:** Stance for the LLM to follow:
- IMMOVABLE (score 0-30)
- FIRM (score 31-50)
- SKEPTICAL (score 51-70)
- RELUCTANT (score 71-85)
- CONCEDE (score 86-100)

**Disengagement detection:**
- Two consecutive non-answers → case closure (denied)
- Non-answer = one-word reply, restating "I want it", ignoring the question, demanding permission

See hank-scoring-engine.md for full scoring design.

### 3. "Saved You $X" Counter

Visible on the main screen. The value proof.

- Every denied conversation adds the item's estimated price to the running total
- User provides estimated price at start of conversation (optional — Hank can ask)
- Persisted in Convex, tied to account
- Displayed prominently: "Hank has saved you $847"
- Only counts items the user decided NOT to buy (denied + user accepted the denial)

### 4. Conversation History

Past arguments with Hank. Scrollable list.

- Each entry: item name/photo, date, verdict (denied/approved), amount
- Tap to revisit full conversation
- Stored in Convex
- Powers Hank's memory — past conversations fed as context for pattern detection
- "You asked about headphones two weeks ago. And last month."

### 5. Credit System

**Free tier:**
- 3 credits per day, reset daily at midnight
- Do not accumulate — use them or lose them
- One credit = one conversation (not one message)

**Paid tier:**
- Credit packs via Apple In-App Purchase
- e.g., 10 for $0.99, 30 for $1.99, 75 for $3.99
- Credits never expire once purchased
- Free daily credits still apply on top

**Payments:**
- **Web:** Stripe. You keep ~97%. This is the better margin.
- **iOS:** Apple In-App Purchase. Apple takes 30%. Required for digital goods on iOS, no workaround.
- Both flows write to the same credit balance in Convex. Two entry points, one system.
- TikTok links point to web app → Stripe purchases = better margins.

### 6. Share

- Share button on completed conversations
- Generates a share card or screenshot of the conversation
- Optimized for Instagram Stories / TikTok — this is the distribution engine
- Every conversation is a potential piece of content

### 7. Push Notifications

Follow-up nudges after conversations:
- "You asked about AirPods 3 days ago. Did you stay strong?"
- "No impulse purchases this week. That's $0 wasted."
- "Hank has saved you $200 this month. Don't blow it now."

Requires:
- expo-notifications setup
- Notification scheduling logic in Convex
- Permission prompt (delayed — not on first open)

---

## LLM Integration

### Conversation Model
- Claude Haiku or GPT-4o-mini (cheapest capable model)
- System prompt carries Hank's entire personality and rules
- System prompt explicitly says: "You do not decide when to concede. You will be told your stance. Follow it."
- Structured output: Hank's response text + JSON scores per factor

### Vision Model
- For photo input — user snaps a photo of the item
- Same model if it supports vision, or separate vision call
- Extracts: what the item is, estimated category, estimated price range

### LLM Proxy
- All LLM calls go through Convex actions (server-side)
- API keys stored in Convex environment variables
- Client never touches LLM APIs directly

### Cost per conversation
- ~$0.005-0.01 for text conversation (3-5 exchanges)
- ~$0.01-0.02 with vision (photo input)
- 3 free/day × 1,000 DAU = ~$15-30/day in API costs
- Credit pack revenue covers this with healthy margins

---

## Screens

### Screen 1: Conversation (Main)
- "Saved $X" counter at top
- Chat interface with Hank
- Text input + photo input (camera/library)
- Hank's responses with personality
- Verdict display (denied/approved) at conversation end
- Share button on completed conversations
- Credits remaining indicator

### Screen 2: History
- Chronological list of past conversations
- Each entry: item name/thumbnail, date, verdict, amount
- Tap to revisit full conversation
- No categories, no filters, no organization in v1

### Screen 3: Credits (minimal)
- Current credit balance (free + purchased)
- Buy credit packs (IAP)
- Could be a modal/sheet rather than a full screen

---

## Web App + Landing Page (Vercel)

The web app and landing page are the same site. Not separate.

- React Native for Web, hosted on Vercel
- Landing/marketing content at the root — what it is, demo screenshot, sign-in CTA
- Sign in → you're talking to Hank. No separate "app" to navigate to.
- TikTok link-in-bio → land on the page → sign in → arguing with Hank in seconds
- App Store link added later when iOS ships
- Social proof later: "Hank has saved users $X"

---

## What NOT to Build (v1)

- No budgets, categories, or dashboards
- No bank connections or statement uploads
- No onboarding tutorial — sign in and go
- No gamification (no streaks, no badges, no scores shown to user)
- No social features
- No "Which One?" comparison mode
- No additional OAuth providers beyond Google (Apple Sign-In deferred to iOS launch)
- No profile or settings screen
- No Android native (web app covers all platforms)
- No native iOS at launch (ships after web is validated)

---

## External Requirements

| Requirement | Cost | Notes |
|-------------|------|-------|
| Apple Developer Account | $99/year | Not needed until iOS ships |
| Convex | Free tier | More than enough to start |
| Vercel | Free tier | Web app + landing page |
| Stripe | Pay-per-transaction | Web credit pack purchases |
| LLM API (Anthropic or OpenAI) | Pay-per-use | ~$0.01/conversation |
| Expo / EAS | Free tier | 15 iOS builds/month, Expo Go unlimited |
| expo-notifications | Free | Push notification infrastructure |

### Legal
- Privacy Policy — required by Apple
- Terms of Service — required by Apple
- Both can be simple pages hosted on the landing page site

### App Store Submission
- Apple has rejected "thin LLM wrapper" apps. Hank has enough native logic to pass:
  - Scoring engine (deterministic, not LLM)
  - Credit system with IAP
  - Conversation history with memory
  - "Saved $X" tracking
  - Push notifications
  - Photo input with camera integration
- App review category: Finance or Lifestyle

---

## Dependencies Between Features

```
Auth ──────────────► Everything (nothing works without identity)
                     │
LLM Integration ────► Conversation Screen
                     │
Scoring Engine ─────► Conversation Screen (determines Hank's stance)
                     │
Conversation ───────► History (conversations feed history)
        │
        ├───────────► "Saved $X" Counter (denied conversations add to total)
        │
        └───────────► Push Notifications (iOS only, ships later)

Credits ────────────► Conversation Screen (gating)
        │
        └───────────► Stripe (web) / IAP (iOS, later)

Web App + Landing ──► Single Vercel deployment (marketing + app in one)

iOS App ────────────► Ships after web is validated
```

**Web launch order:** Auth → LLM integration → Scoring engine → Conversation → Credits + Stripe → History → Saved counter → Share

Push notifications and IAP are iOS-only, deferred until native ships.
