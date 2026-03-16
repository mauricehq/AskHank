# Hank — Landing Page

## The Problem

Current signed-out experience is a logo and two buttons. Every visitor who isn't already sold bounces. The landing page needs to show the product working, set expectations, and convert — without a single backend call.

## Design Principles

The page should feel like Hank wrote it.

- **Dry and confident.** No begging. No marketing superlatives.
- **Short sentences.** Declarative. Subject-verb-object.
- **No emojis. No exclamation marks.** Period.
- **Section headers are uppercase, small, tracked.** Like file labels. Bureaucratic, not flashy.
- **"Not for everyone" is the positioning.** Filtering out bad-fit users IS the sell.

Tone test: if a sentence could appear on any SaaS landing page, rewrite it. If it could only be on Hank's page, keep it.

---

## Target Page (post-rework)

Single scrolling page. Dark mode only. Fixed navbar with persistent "Try it free" CTA.

Alternating backgrounds: default bg ↔ `bg-bg-surface` for visual rhythm.

**Changes from current page:**
- Hero subtitle promoted to match "Ask Hank first" weight (issue #3)
- ChatDemo: espresso tab replaced with running shoes deal-hunter tab, real Hank copy (issue #5)
- Section order: HowItWorks moved up, WhyHankWorks moved down — breaks the explanation plateau (issue #4)
- Scorecard: reframed as example, not fake personal stats (issue #2)
- FreeToTry: message unit clarified (issue #1)

```
Hero → ChatDemo → AiComparison (surface) → HowItWorks → WhyHankWorks (surface) → Scorecard → FreeToTry (surface) → FairWarning → FinalCTA
```

---

### Navbar (fixed)

```
[icon] Ask Hank          Demo   How It Works   Pricing          [Sign in] [Try it free]
```

- Transparent at top, blurred bg on scroll (> 20px)
- Mobile: hamburger menu with slide-in dropdown
- Signed-in users see "Open Hank" instead of auth buttons

---

### 1. Hero

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                                                                 │
│              About to buy something you don't need?             │  ← h1, "you don't need?" in accent
│                                                                 │
│          Hank challenges your reasoning before you              │  ← PROMOTED: text-base/lg, white
│          spend the money. Ask him first.                         │     (was text-sm text-secondary)
│                                                                 │
│     Think of him as the friend who's better                     │  ← text-sm, text-secondary
│     with money than you.                                         │
│                                                                 │
│                    [Try it free]  [Sign in]                      │
│                                                                 │
│                          Scroll ▾                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Changed:** The value prop ("challenges your reasoning before you spend") is now the subtitle at full weight. "Ask Hank first" folded into the same line. The "friend who's better with money" line stays secondary — it's flavor, not the pitch.

---

### 2. ChatDemo                                                    `bg: default`

```
┌─────────────────────────────────────────────────────────────────┐
│                       SOUND FAMILIAR?                           │
│    You've had this argument with yourself before.               │
│    Except you always win.                                       │
│                                                                 │
│    [Sneakers] [Washer] [Candles] [Monitor]                      │  ← 4 tabs (Sneakers replaces Espresso)
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  ● ● ●  │  Ask Hank                                      │  │
│  │──────────────────────────────────────────────────────────│  │
│  │                                                           │  │
│  │          Found some running shoes marked  ┐               │  │
│  │          down from $300 to $180. 40% off, │               │  │
│  │          seems like a steal.              ┘               │  │
│  │                                                           │  │
│  │  HANK                                                     │  │
│  │  ┌ $180 shoes because they were $300. You keep           │  │
│  │  └ receipts like trophies for purchases you never use.   │  │
│  │                                                           │  │
│  │          ... (conversation plays out) ...                 │  │
│  │                                                           │  │
│  │  ┌────────────────────────────────────────┐               │  │
│  │  │   CASE CLOSED — DENIED ($180)          │               │  │
│  │  │   "You folded faster than a lawn       │               │  │
│  │  │    chair at a discount shoe sale."     │               │  │
│  │  └────────────────────────────────────────┘               │  │
│  │                                                           │  │
│  │  ┌ Tell Hank what you want to buy...    [↑] ┐             │  │
│  │  └──────────────────────────────────────────┘             │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

4 tabs auto-cycle (espresso replaced by sneakers — espresso already appears in AiComparison):
- **Running Shoes ($180, was $300)** — DENIED. Deal-hunter persona. "Lawn chair at a discount shoe sale."
- **Pressure Washer ($200)** — APPROVED. Hard-won. Shows Hank is fair.
- **Scented Candles ($45)** — DENIED. "Self-care vs retail therapy."
- **Gaming Monitor ($800)** — DENIED. Memory callback — but now references sneakers, not espresso.

**New conversation — Running Shoes (deal-hunter) — from real Hank session:**
```
User: Found some running shoes marked down from $300
      to $180. 40% off, seems like a steal.

Hank: $180 shoes because they were $300. You keep
      receipts like trophies for purchases you
      never actually use.

User: No but 40% off doesn't come around often.
      I'd be losing money NOT buying them.

Hank: $180 is still $180. You'll wear them twice
      before they join the graveyard of "good deals"
      in your closet.

User: ok fine you win

VERDICT: CASE CLOSED — DENIED ($180)
  "You folded faster than a lawn chair at a
   discount shoe sale."
```

Dismantles the deal-hunter rationalization: "$180 is still $180." The closer is pure Hank.

**Gaming Monitor memory callback** now needs to reference sneakers instead of espresso:
"Last week it was $180 running shoes on sale. Now it's an $800 monitor."

---

### 3. AI Comparison                                               `bg: bg-surface`

```
┌─────────────────────────────────────────────────────────────────┐
│                      WHY NOT JUST ASK AI?                       │
│       Every other AI is designed to agree with you.             │
│       Hank isn't.                                               │
│                                                                 │
│              ┌─────────────────────────────────────┐            │
│              │ I want to buy a $350 espresso        │            │
│              │ machine. My Keurig works fine but I  │            │
│              │ feel like I deserve better coffee.   │            │
│              └─────────────────────────────────────┘            │
│                                                                 │
│  ┌──────────────────────┐    ┌──────────────────────────┐       │
│  │  OTHER AI (faded)    │    │  HANK (accent border)    │       │
│  │                      │    │                          │       │
│  │  "You absolutely     │    │  "A $350 espresso        │       │
│  │  deserve great       │    │  machine for a Keurig    │       │
│  │  coffee! A $350      │    │  person. That's like     │       │
│  │  espresso machine    │    │  buying a Ferrari to     │       │
│  │  is a wonderful      │    │  drive to your desk      │       │
│  │  investment..."      │    │  job."                   │       │
│  │                      │    │                          │       │
│  │  👍 Enabled the      │    │  ⚔️ Challenged the       │       │
│  │     purchase         │    │     purchase             │       │
│  └──────────────────────┘    └──────────────────────────┘       │
│                                                                 │
│  • They're optimized for engagement, not accountability.        │
│  • They have no opinion. Hank is built to have one.             │
│  • They enable the purchase. Hank makes you earn it.            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

No changes. This section works as-is.

---

### 4. How It Works *(moved up — was section 5)*                   `bg: default`

```
┌─────────────────────────────────────────────────────────────────┐
│                    IT'S JUST A CONVERSATION                     │
│           No spreadsheets. No tracking. No homework.            │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │                  │  │                  │  │              │  │
│  │  (01) 💬         │  │  (02) ⚔️         │  │  (03) ⚖️     │  │
│  │                  │  │                  │  │              │  │
│  │  Tell Hank what  │  │  He pushes back. │  │  You get a   │  │
│  │  you want to     │  │  You push back.  │  │  verdict.    │  │
│  │  buy.            │  │                  │  │  Usually     │  │
│  │                  │  │  If your         │  │  "no."       │  │
│  │  Open a convo.   │  │  argument holds  │  │              │  │
│  │  Type the item.  │  │  up, he'll come  │  │  You see how │  │
│  │  That's it.      │  │  around. Most    │  │  much you    │  │
│  │                  │  │  don't.          │  │  didn't      │  │
│  │                  │  │                  │  │  spend.      │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Why moved up:** Breaks the explanation plateau. AiComparison (persuasion) → HowItWorks (functional, visual, light) → WhyHankWorks (persuasion). The functional section gives the brain a break between two argument-driven sections.

---

### 5. Why Hank Works *(moved down — was section 4)*               `bg: bg-surface`

```
┌─────────────────────────────────────────────────────────────────┐
│                   YOU'VE TRIED EVERYTHING ELSE                  │
│                                                                 │
│  ┌───────────────────────────┐  ┌────────────────────────────┐  │
│  │                           │  │                            │  │
│  │  You've tried the 24-hour │  │  ✗ Timers                  │  │
│  │  rule. The no-buy         │  │    You wait 24 hours and   │  │
│  │  challenge. The           │  │    buy it anyway.          │  │
│  │  spreadsheet. None of it  │  │                            │  │
│  │  stuck — because none of  │  │  ✗ Streaks                 │  │
│  │  it pushed back.          │  │    Not buying something    │  │
│  │                           │  │    isn't an action.        │  │
│  │  Hank makes you argue     │  │                            │  │
│  │  your case out loud. The  │  │  ✗ Checklists              │  │
│  │  impulse dies in the      │  │    "Do I need this?"       │  │
│  │  conversation, not after  │  │    You check yes. You      │  │
│  │  a timer.                 │  │    buy it.                 │  │
│  │                           │  │                            │  │
│  │                           │  │  ✓ Hank                    │  │
│  │                           │  │    A debate you have to    │  │
│  │                           │  │    win. This app is the    │  │
│  │                           │  │    friction.               │  │
│  │                           │  │                            │  │
│  └───────────────────────────┘  └────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

No content changes. Just repositioned after HowItWorks to break the explanation block.

---

### 6. Scorecard *(reframed)*                                      `bg: default`

```
┌─────────────────────────────────────────────────────────────────┐
│                      THE COST OF IMPULSE                        │
│    The average person spends $3,400 a year on things they       │
│    didn't need. That's a vacation. An emergency fund.           │
│    114 hours at work — gone.                                    │
│                                                                 │
│    Here's what a year with Hank looks like:                     │  ← NEW: explicit example framing
│                                                                 │
│       ┌──────────────────┐    ┌──────────────────┐              │
│       │   💰              │    │   🕐              │              │
│       │   Saved           │    │   That's          │              │
│       │      $2,847       │    │      114          │              │  ← animated count-up
│       │   this year       │    │   hours of work   │              │
│       │                   │    │                   │              │
│       │   47 denied       │    │   Kept.           │              │
│       │   3 approved      │    │                   │              │
│       └──────────────────┘    └──────────────────┘              │
│                                                                 │
│    Every purchase Hank talks you out of adds to your total.     │
│    The app pays for itself on day one.                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Changed:** Removed "You've saved" (fake personalization). Added "Here's what a year with Hank looks like:" to explicitly frame the numbers as an example, not the visitor's stats. Cards now say "Saved" and "Kept" instead of "You've saved" and "You kept."

---

### 7. Free to Try *(clarified)*                                   `bg: bg-surface`

```
┌─────────────────────────────────────────────────────────────────┐
│                         FREE TO TRY                             │
│                                                                 │
│                     ┌ No subscription ┐                         │
│                                                                 │
│    An app that tells you not to spend money                     │
│    shouldn't charge you monthly.                                │
│    Hank lets you argue for free.                                │
│                                                                 │
│              30 free messages. No credit card.                   │  ← bold
│    A typical conversation is about 7-10 messages.                      │  ← NEW: clarifier
│                                                                 │
│    No subscription. No trial that expires.                      │
│    If you run out, credit packs start at $1.99.                 │
│                                                                 │
│       ┌──────────┐    ┌──────────────┐    ┌──────────┐          │
│       │    50    │    │     150      │    │   400    │          │
│       │ messages │    │   messages   │    │ messages │          │
│       │  $1.99   │    │    $4.99     │    │  $9.99   │          │
│       └──────────┘    │ Most Popular │    └──────────┘          │
│                       └──────────────┘                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Changed:** Added "A typical conversation is about 7-10 messages." after the "30 free messages" line. Visitor now knows 30 messages ≈ 6-10 conversations.

---

### 8. Fair Warning                                                `bg: bg-surface, border-t/b`

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                    ⚠ FAIR WARNING                               │
│                                                                 │
│    Hank is not a therapist. Not a budgeting app.                │
│    Not gentle. Not supportive. Not encouraging.                 │
│                                                                 │
│    He is a debate partner. Sarcastic, blunt,                    │
│    and usually right. Like a friend who's better                │
│    with money than you are.                                     │
│                                                                 │
│    If you can't take the debate, don't sign up.                 │  ← bold
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

No changes. Works as-is.

---

### 9. Final CTA                                                   `bg: default`

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│         You already know you don't need it.                     │  ← h2, "don't need it." in accent
│         Hank just makes sure you don't buy it.                  │
│                                                                 │
│                      [Try it free]                              │  ← hover glow
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

No changes.

---

### Footer

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  [icon] Ask Hank              Product         Legal             │
│  Tell him what you            Demo            Terms of Service  │
│  want to buy.                 How It Works    Privacy Policy    │
│  He pushes back.              Pricing         Contact           │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  © 2026 AskHank                                    [✉]          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## What This Page Deliberately Excludes

- **Social proof / testimonials.** No users yet. Don't fake it.
- **Live chat input for anonymous users.** Abuse vector, cost risk, dishonest if faked.
- **Video / screen recordings.** The auto-play demo replaces this need.
- **Separate pricing page.** Credit packs are informational only.
- **Legal pages.** Later task.
- **Canvas animations / background effects.** Hopshelf has `CarbonationBackground.tsx` (bubble animation). Hank doesn't need ambient effects — whitespace is the aesthetic.

---

## Evaluation Findings (March 2026)

Three-agent review of the live page across clarity, curiosity/engagement, and target persona conversion.

### What's working

- **ChatDemo is the strongest section.** The auto-playing conversations are the single most effective selling tool. Lines like "That's a Pinterest board with a credit card" are screenshot-and-share quality.
- **Pricing is disarming.** "An app that tells you not to spend money shouldn't charge you monthly" is one of the best lines on the page. Removes the biggest objection.
- **FairWarning earns its place.** The personality filter ("Not gentle. Not supportive. Not encouraging.") does real brand work and creates "are you tough enough?" FOMO.
- **Tone is calibrated correctly.** Playfully confrontational, not judgmental. The pressure washer approval is critical — proves Hank is fair, not just a "no" machine.
- **Zero jargon.** No "AI-powered behavioral nudge engine." A non-technical person understands every word.
- **AiComparison intercepts the right objection.** The side-by-side contrast between sycophantic AI and Hank lands viscerally.

### Issues identified → addressed in target page

1. **Clarify message units** — Added "A typical conversation is 3-5 messages" line to FreeToTry (section 7)
2. **Scorecard fake personalization** — Reframed: "Here's what a year with Hank looks like:" + removed "You've/You" from cards (section 6)
3. **Hero subtitle hierarchy** — Promoted value prop to subtitle weight, folded "Ask Hank first" into same line (section 1)
4. **Explanation plateau** — Swapped HowItWorks and WhyHankWorks. Now: AiComparison (persuasion) → HowItWorks (functional break) → WhyHankWorks (persuasion). No more three-argument block.
5. **Deal-hunter persona** — Espresso tab replaced with "Running Shoes ($180, was $300)" from a real Hank session. "$180 is still $180." Replaces espresso (which now lives in AiComparison). Monitor memory callback updated to reference sneakers.

### Not issues (despite agent flags)

- **"No CTA at peak curiosity"** — The navbar has a persistent "Try it free" button. CTA is never more than a glance away.
- **"No social proof"** — Can't fake it pre-launch. Social proof is a post-launch addition. The spec already says this in "What This Page Deliberately Excludes."

### Persona fit

| Persona | Fit | Notes |
|---|---|---|
| **Treat-yourself spender** | Strong | Candles demo is a direct hit. "Self-care vs retail therapy" names their exact rationalization. |
| **Lifestyle aspirant** | Strong | Espresso machine demo is tailor-made. "Pinterest board with a credit card" is a character description. |
| **Serial returner** | Partial | Recognizes the general problem but nothing names the return cycle specifically. |
| **Deal hunter** | Missing | Page has nothing for them. Biggest gap. |

---

## Resolved Questions

1. ~~**Credit pack display — worth showing tiers visually?**~~ Yes. Three cards (50/$1.99, 150/$4.99, 400/$9.99) with "Most Popular" badge on middle tier. Anchors the price as cheap without distracting from the free message.

2. ~~**Should there be a "Saved $X by Hank users" counter eventually?**~~ Section 5 shows a per-user mockup with dollars + work hours side by side. Needs reframing (see evaluation issue #2).

3. ~~**The Hank logo/icon — should it appear in the hero?**~~ Yes. Icon in the navbar next to "Ask Hank" text, same pattern as Hopshelf's `HopshelfIcon` in `Navbar.tsx`. Uses `AskHankIcon.svg` at ~24px.

4. ~~**Auto-play conversation count — 3 or 4?**~~ 4 tabs. Espresso machine, pressure washer, scented candles, gaming monitor (memory callback).
