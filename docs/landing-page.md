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
- Hero: deduplicate "friend who's better with money" (lives in FairWarning now)
- Navbar: mobile CTA swap — "Try it free" visible, "Sign in" in hamburger
- HowItWorks: reworked into credibility section — surfaces scoring engine + memory
- Scorecard: generic copy rewritten, numbers labeled as projection
- FreeToTry: header rewritten, generic copy killed, conversation counts added, mobile grid fixed, privacy line added

```
Hero → ChatDemo → AiComparison (surface) → HowItWorks → WhyHankWorks (surface) → Scorecard → FreeToTry (surface) → FairWarning → FinalCTA → FAQ (surface)
```

---

### Navbar (fixed)

```
Desktop:
[icon] Ask Hank          Demo   How It Works   Pricing          [Sign in] [Try it free]

Mobile:
[☰] [icon] Ask Hank                                             [Try it free]
```

- Transparent at top, blurred bg on scroll (> 20px)
- Mobile: "Try it free" is the visible button. "Sign in" moves inside the hamburger menu.
- Signed-in users see "Open Hank" instead of auth buttons

**Changed:** Mobile navbar swapped — primary CTA ("Try it free") is now always visible. "Sign in" (returning users) is in the hamburger. New users are the priority on mobile.

---

### 1. Hero

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                                                                 │
│              About to buy something you don't need?             │  ← h1, "you don't need?" in accent
│                                                                 │
│          Hank challenges your reasoning before you              │  ← text-base/lg, white
│          spend the money. Ask him first.                         │
│                                                                 │
│     You keep the money, or you earn the right to spend it.      │  ← text-sm, text-secondary
│                                                                 │
│                    [Try it free]  [Sign in]                      │
│                                                                 │
│                          Scroll ▾                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Changed:** Secondary line is now "You keep the money, or you earn the right to spend it." — centers the user payoff and builds curiosity ("earn the right" implies a challenge, makes you scroll to find out how). The "friend who's better with money" metaphor now lives exclusively in FairWarning where it's earned.

---

### 2. ChatDemo                                                    `bg: default`

```
┌─────────────────────────────────────────────────────────────────┐
│                       SOUND FAMILIAR?                           │
│    You've had this argument with yourself before.               │
│    Except you always win.                                       │
│                                                                 │
│    [Sneakers] [Washer] [Candles] [Monitor]                      │  ← 4 tabs
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

No changes from previous rework. Sneakers tab, content-based pacing, persistent typing indicators.

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

### 4. How It Works *(reworked — was 3-step tutorial)*              `bg: default`

```
┌─────────────────────────────────────────────────────────────────┐
│                    NOT JUST ATTITUDE                             │
│       There's a brain behind the sarcasm.                       │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │                  │  │                  │  │              │  │
│  │  (01) ⚖️         │  │  (02) 🧠         │  │  (03) 📊     │  │
│  │                  │  │                  │  │              │  │
│  │  He scores your  │  │  He remembers    │  │  ~10% of     │  │
│  │  arguments.      │  │  your patterns.  │  │  purchases   │  │
│  │                  │  │                  │  │  get through. │  │
│  │  Every claim you │  │  Bought sneakers │  │              │  │
│  │  make gets       │  │  last week? He   │  │  Hank        │  │
│  │  weighed. Vague  │  │  knows. Tried    │  │  concedes    │  │
│  │  feelings don't  │  │  this argument   │  │  when you    │  │
│  │  score well.     │  │  before? He      │  │  earn it.    │  │
│  │                  │  │  noticed.        │  │  Most don't. │  │
│  │                  │  │                  │  │              │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Changed:** The old 3-step tutorial ("Tell Hank, push back, get verdict") was redundant — the ChatDemo already showed this. Reworked to surface what makes Hank different from a system-prompt wrapper: scoring engine, cross-conversation memory, and calibrated concession rate. Kills the "just a chatbot with attitude" objection. Header changed from "It's Just a Conversation" to "Not Just Attitude."

---

### 5. Why Hank Works                                              `bg: bg-surface`

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

No content changes.

---

### 6. Scorecard *(copy rewritten)*                                `bg: default`

```
┌─────────────────────────────────────────────────────────────────┐
│                        THE COST OF IMPULSE                              │
│    The average person blows $3,400 a year on things they        │
│    didn't need. That's 114 hours at your job. Gone.             │
│                                                                 │
│    Here's what a year with Hank looks like:                     │
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
│    You'll make back the $1.99 before lunch.                     │  ← was "The app pays for itself on day one."
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Changed:**
- Header: stays "The Cost of Impulse"
- Subhead: cut vacation/emergency fund comparisons (generic financial advisor language), tightened to "114 hours at your job. Gone."
- "spends" → "blows" — more Hank
- Added "Based on avg. impulse spending of $3,400/year." — labels the numbers as projection, not fabricated personal stats
- "The app pays for itself on day one." → "You'll make back the $1.99 before lunch." — specific, grounded in actual price, dry confidence

---

### 7. Free to Try *(header + copy rewritten)*                     `bg: bg-surface`

```
┌─────────────────────────────────────────────────────────────────┐
│                       WHAT IT COSTS                             │  ← was "FREE TO TRY"
│                                                                 │
│                     ┌ No subscription ┐                         │
│                                                                 │
│    An app that tells you not to spend money                     │
│    shouldn't charge you monthly.                                │
│    Hank lets you argue for free.                                │
│                                                                 │
│              30 free messages. No credit card.                   │  ← bold
│        A typical conversation is about 7-10 messages.           │
│                                                                 │
│    No trial that expires.                                       │  ← removed redundant "No subscription."
│    If you run out, credit packs start at $1.99.                 │
│                                                                 │
│       ┌──────────┐    ┌──────────────┐    ┌──────────┐          │
│       │    50    │    │     150      │    │   400    │          │
│       │ messages │    │   messages   │    │ messages │          │
│       │ ~5-7     │    │  ~15-21     │    │ ~40-57   │          │  ← NEW: conversation counts
│       │  convos  │    │   convos    │    │  convos  │          │
│       │  $1.99   │    │    $4.99     │    │  $9.99   │          │
│       └──────────┘    │ Most Popular │    └──────────┘          │
│                       └──────────────┘                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Changed:**
- Header: "Free to Try" → "What It Costs" — every freemium SaaS says "free to try." This is more direct.
- "Buy what you need, when you need it." → cut entirely. Generic SaaS copy that contradicted the product's thesis.
- Removed redundant "No subscription." from the body (already in the badge and first paragraph).
- Added approximate conversation counts under each credit pack (~5-7, ~15-21, ~40-57). Visitors think in conversations, not messages.
- Privacy line moved to FAQ section.
- Mobile: grid changes from `grid-cols-3` to `grid-cols-1 sm:grid-cols-3` to prevent cramping on small screens.

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

No changes. "Friend who's better with money" now lives exclusively here (removed from Hero). The metaphor is earned — the visitor has seen the product in action by this point.

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

### 10. FAQ                                                        `bg: bg-surface`

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ▸ "Is this just AI with a prompt that says 'be tough'?"         │
│    No. Hank runs a scoring engine that tracks your              │
│    arguments turn by turn. The AI doesn't decide                │
│    when to give in — the math does.                             │
│                                                                 │
│  ▸ "Does Hank ever say yes?"                                    │
│    About 10% of the time. Make a real case                      │
│    and he'll come around.                                       │
│                                                                 │
│  ▸ "Does Hank remember past conversations?"                     │
│    Yes. Buy sneakers this week, try to justify a                │
│    jacket next week — he'll notice the pattern.                 │
│                                                                 │
│  ▸ "What happens when I run out of free messages?"              │
│    Nothing. No lockout, no nag screens. Credit packs            │
│    start at $1.99 when you want more.                           │
│                                                                 │
│  ▸ "Is my data private?"                                        │
│    Your conversations stay between you and Hank.                │
│    No ads. No data selling.                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**New section.** Consolidates technical details (scoring engine, memory), skeptic objections ("just ChatGPT?"), and trust signals (privacy, post-free experience) into one scannable place. Keeps the main page flow emotional and clean — the people who need these answers will find them here.

Collapsible accordion on desktop and mobile. Each question is a toggle.

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

- **Social proof / testimonials.** No users yet. Don't fake it. Add post-launch.
- **"AI" in the hero.** Leads with the problem, not the technology. The demo makes it obvious.
- **Live chat input for anonymous users.** Abuse vector, cost risk, dishonest if faked.
- **Video / screen recordings.** The auto-play demo replaces this need.
- **Separate pricing page.** Credit packs are informational only.
- **Legal pages.** Later task.
- **Canvas animations / background effects.** Whitespace is the aesthetic.
- **Extra CTAs after ChatDemo / FreeToTry.** Navbar CTA is persistent on desktop. FinalCTA is close below FreeToTry. Adding more would feel desperate for a product whose brand is confident restraint.

---

## Evaluation Findings

### Round 1 (March 2026) — 3-agent review

Clarity, curiosity/engagement, and target persona conversion.

**What's working:**
- ChatDemo is the strongest section. Auto-playing conversations are the single most effective selling tool.
- Pricing is disarming. "An app that tells you not to spend money shouldn't charge you monthly" removes the biggest objection.
- FairWarning earns its place. Creates "are you tough enough?" FOMO.
- Tone is calibrated correctly. Pressure washer approval proves Hank is fair.
- Zero jargon. A non-technical person understands every word.
- AiComparison intercepts the right objection.

**Issues identified → addressed:**
1. Clarify message units → added "7-10 messages" clarifier to FreeToTry
2. Scorecard fake personalization → reframed with "Here's what a year with Hank looks like:"
3. Hero subtitle hierarchy → promoted value prop, folded "Ask Hank first" into same line
4. Explanation plateau → swapped HowItWorks and WhyHankWorks
5. Deal-hunter persona → sneakers tab replaces espresso in ChatDemo

### Round 2 (March 2026) — 5-agent review

Cold visitor, copywriting, CRO, skeptic, and narrative/behavioral perspectives.

**What's working (new):**
- ChatDemo pacing rework (content-based delays, persistent typing indicators) keeps the demo feeling alive.
- AiComparison → HowItWorks → WhyHankWorks flow is better than previous order.
- FairWarning's reverse psychology is psychologically effective — triggers reactance.
- Emotional arc peaks at AiComparison (the "aha" moment) around 30-40% scroll depth — good placement.
- Loss aversion in Scorecard (dollars reframed as work hours) is strong.

**Issues identified → addressed in target page:**

| # | Issue | Fix | Priority |
|---|---|---|---|
| 1 | Mobile navbar hides primary CTA | Swap: "Try it free" visible, "Sign in" in hamburger | P0 |
| 2 | Scoring engine / memory invisible — Hank looks like a system-prompt wrapper | Rework HowItWorks into credibility section: scoring, memory, concession rate | P1 |
| 3 | HowItWorks was redundant 3-step tutorial after watching 4 demo conversations | Replaced by credibility section (solves #2 and #3 simultaneously) | P1 |
| 4 | Generic SaaS copy: "The app pays for itself on day one", "Buy what you need, when you need it", "Free to Try" header | Rewritten: "You'll make back the $1.99 before lunch", "Ironic, we know.", "What It Costs" | P1 |
| 5 | "Friend who's better with money" duplicated in Hero and FairWarning | Hero rewritten to "Except this time, you won't win." FairWarning keeps the metaphor. | P1 |
| 6 | Scorecard numbers look fabricated | Added "Based on avg. impulse spending of $3,400/year" label | P2 |
| 7 | Credit packs show messages, visitors think in conversations | Added ~conversation counts under each pack | P2 |
| 8 | Privacy, scoring engine details, and skeptic objections need a home | Added FAQ section (accordion) after FinalCTA — consolidates technical details, privacy, and objection handling | P2 |
| 9 | FreeToTry grid-cols-3 cramped on mobile | Changed to grid-cols-1 sm:grid-cols-3 | P2 |

**Not issues (despite agent flags):**
- **"No CTA at peak curiosity"** — navbar CTA is persistent on desktop. FinalCTA is close below FreeToTry.
- **"No social proof"** — can't fake it pre-launch. Deliberate exclusion.
- **"Add AI to the hero"** — leads with problem, not technology. Demo makes it obvious within seconds.
- **"FairWarning suppresses conversion before FinalCTA"** — it's a feature, not a bug. The reverse psychology drives signups for this audience.

### Persona fit (updated)

| Persona | Fit | Notes |
|---|---|---|
| **Treat-yourself spender** | Strong | Candles demo. "Self-care vs retail therapy." |
| **Lifestyle aspirant** | Strong | Espresso machine in AiComparison. "Ferrari to drive to your desk job." |
| **Deal hunter** | Strong | Sneakers demo. "$180 is still $180." Dismantles the discount rationalization. |
| **Serial returner** | Partial | Recognizes the general problem but nothing names the return cycle specifically. |
| **Skeptic / "just a chatbot"** | Improved | New HowItWorks section surfaces scoring engine, memory, and concession rate. |

---

## Resolved Questions

1. ~~**Credit pack display — worth showing tiers visually?**~~ Yes. Three cards with "Most Popular" badge. Anchors the price as cheap.

2. ~~**Should there be a "Saved $X by Hank users" counter eventually?**~~ Scorecard shows projection now. Replace with real aggregates post-launch.

3. ~~**The Hank logo/icon — should it appear in the hero?**~~ Yes. Icon in navbar next to "Ask Hank" text. Uses `AskHankIcon.svg` at ~24px.

4. ~~**Auto-play conversation count — 3 or 4?**~~ 4 tabs. Sneakers, pressure washer, scented candles, gaming monitor (memory callback).

5. ~~**HowItWorks: cut or rework?**~~ Rework. The 3-step tutorial was redundant after the demo. Replaced with credibility section surfacing scoring engine, memory, and concession rate. Solves two problems at once.

6. ~~**"AI" in the hero?**~~ No. Leads with the problem, not the technology. The word "AI" appears naturally in AiComparison.
