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

## Reusable from Hopshelf (`D:\code\Hopshelf`)

Hopshelf's landing page is polished and production-tested. Several components and patterns port directly.

### Copy Directly (adapt styling)

| Hopshelf Component | File | What it does | Hank adaptation |
|---|---|---|---|
| **Navbar** | `components/Navbar.tsx` (145 lines) | Fixed navbar — transparent on top, blur bg on scroll. Logo + scroll anchor links + auth-aware CTAs. Mobile hamburger with slide-in menu. | Same skeleton. Replace Hopshelf logo/name with Ask Hank. Replace `Link` auth routes with Clerk `SignInButton`/`SignUpButton` modals. Anchor links to Hank's sections (#demo, #how-it-works, #pricing). Restyle to Hank's palette (accent color, DM Sans, no rounded-full pills). |
| **AdvisorPreview** | `components/landing/AdvisorPreview.tsx` (496 lines) | Auto-playing chat mockup with tabs, typing indicator, progress bar, auto-cycle between conversations | Core pattern for Section 2. Replace Tyler's beer conversations with Hank's purchase debates. Strip beer-specific rendering (freshness badges, bold parsing). Restyle to Hank's palette. |
| **useInView hook** | Inline in `AdvisorPreview.tsx` | IntersectionObserver — fires once at 15% threshold, triggers animation on scroll-into-view | Copy as-is. Prevents auto-play from starting before visitor scrolls down. |
| **ShowcaseSection** | `components/landing/ShowcaseSection.tsx` | Wrapper with uppercase label + headline + subhead + children slot | Good pattern for consistent section formatting. Adapt to Hank's typography. |
| **HowItWorks** | `components/landing/HowItWorks.tsx` | 3-step numbered layout with connecting line | Same structure needed. Different content, same skeleton. |
| **FAQ** | `components/FAQ.tsx` | Collapsible Q&A, first item open by default, smooth height transition | Nice-to-have for launch. Can add later if needed. |

### Reuse the Pattern, Rebuild the Code

| Pattern | Hopshelf reference | Why rebuild |
|---|---|---|
| **Message scheduling system** | `AdvisorPreview.tsx` — `schedule()` function, `delay` + `typingDuration` per message | The setTimeout + state management pattern is clean but tightly coupled to Hopshelf's message rendering. Rebuild with Hank's simpler message structure (no freshness badges, no bold parsing). |
| **Typing indicator** | `AdvisorPreview.tsx` — 3 bouncing dots, CSS `animate-bounce` with staggered delays | Hank already has a `TypingIndicator.tsx` in the app, but the landing version needs to be standalone (no Convex). Rebuild a lightweight version or extract a shared component. |
| **Tab navigation** | `AdvisorPreview.tsx` — clickable tabs disable auto-cycle, manual selection | Same UX needed. Different tab labels (purchase items instead of Tyler conversation names). |
| **Progress bar** | `AdvisorPreview.tsx` — shows time remaining before auto-advance to next conversation | Subtle but effective. Tells the visitor "there's more coming" without being intrusive. Rebuild in Hank's accent color. |
| **Section wrapper** | `ShowcaseSection.tsx` — label + headline + children | Simpler to just rebuild with Hank's typography since it's a small component. |

### Don't Reuse

| Component | Why |
|---|---|
| `Hero.tsx` | Hopshelf hero uses animated gradient text and Merriweather serif. Hank's hero is DM Sans, dry, no gradients. |
| `Pricing.tsx` | Hopshelf has 3-tier subscription cards. Hank's credit packs are simpler, informational only. |
| `CarbonationBackground.tsx` | Canvas-based bubble animation. Beer-specific. |
| `PicksViewDemo.tsx`, `AnalyticsShowcase.tsx` | Beer-specific feature demos. |
| `Footer.tsx` | Hopshelf footer has social links, legal links. Hank footer is just the domain. |
| Color palette / typography | Hank has its own system (DM Sans, Southwest palette). |

---

## Page Structure

Single scrolling page. Dark mode default. Fixed navbar + seven sections.

---

### Navbar

**Salvaged from Hopshelf's `Navbar.tsx`.** Fixed top, scroll-aware.

- **Default (top of page):** Transparent background, generous padding
- **On scroll (> 20px):** Blurred background (`backdrop-blur-md`), border bottom, tighter padding
- **Left:** Ask Hank logo/name (click scrolls to top)
- **Center/right (desktop):** Scroll anchor links — Demo, How It Works, Pricing. Keeps the page scannable.
- **Right:** "Sign in" (ghost button, `SignInButton` modal) + "Try it free" (accent button, `SignUpButton` modal). If authenticated: "Open Hank" button that routes to the app.
- **Mobile:** Hamburger menu (Lucide Menu/X icons), slide-in dropdown with anchor links + auth CTA

The navbar keeps the logo visible at all times and gives visitors anchor points without leaving the page. Hopshelf does this well — same single-page setup.

---

### Section 1: Hero

Full viewport. Centered. Generous whitespace.

```
Ask Hank

Tell him what you want to buy. He pushes back.

A spending guardrail disguised as an argument
with a friend who's better with money than you are.

[Try it free]    [Sign in]
```

- "Hank" in accent color
- "Try it free" opens Clerk signup modal
- "Sign in" opens Clerk signin modal
- Subtle scroll indicator at the bottom (chevron down, gentle bounce)
- No theme toggle — landing page is dark mode only. The app has light/dark toggle after sign-in.

---

### Section 2: Auto-Play Chat Demo

**The most important section.** Show the product working — live, not as a screenshot.

**Header:** `WHAT HANK SOUNDS LIKE`

**Salvaged from Hopshelf's `AdvisorPreview.tsx`.** Same architecture, different content:

#### How it works (from Hopshelf)

The auto-play uses a schedule-based timing system:

```typescript
interface Message {
  role: "user" | "hank"
  content: string
  delay: number           // ms before showing this message
  typingDuration?: number // ms to show typing dots (hank only)
}

interface DemoConversation {
  id: string
  label: string           // Tab label (desktop)
  shortLabel: string      // Tab label (mobile)
  verdict: "denied" | "approved"
  messages: Message[]
}
```

Each message is scheduled via `setTimeout`. Hank messages show a typing indicator first (3 bouncing dots), then reveal the text. The whole system uses React state — `setVisibleCount` increments to show the next message.

**Key behaviors (all from Hopshelf, keep all of them):**
- **Viewport trigger:** `useInView` hook (IntersectionObserver) — animation only starts when scrolled into view
- **Tab navigation:** Clickable tabs to switch between conversations. Clicking a tab cancels auto-cycle and plays that conversation.
- **Auto-cycle:** After a conversation finishes, 4-second pause with progress bar, then auto-advances to next conversation
- **Typing indicator:** 3 bouncing dots before each Hank message. Creates the "what's he going to say?" tension.
- **Cleanup:** All timeouts tracked in a ref, cleared on tab switch or unmount

#### Conversations to demo

**Tab 1 — Espresso Machine ($900) — DENIED**
```
User: I want to buy a $900 espresso machine.
  [delay: 0]

Hank: $900 on a machine that'll sit next to the
      other appliances you swore you'd use daily.
      What are you making coffee with now?
  [delay: 800, typingDuration: 1500]

User: A drip maker. It works fine.
  [delay: 1200]

Hank: So you have a working coffee maker and you
      want to spend $900 because... the foam?
      That's a Pinterest board with a credit card.
  [delay: 800, typingDuration: 1800]

User: ok fine I don't need it
  [delay: 1500]

VERDICT: CASE CLOSED — DENIED ($900)
  [delay: 1000]
```

**Tab 2 — Pressure Washer ($200) — APPROVED (hard-won)**

The only APPROVED example. Critically, this one is *earned* — the user fights for 4 rounds before Hank concedes. Shows the product isn't a blanket "no" bot, but you have to make a real case. Based on a real conversation.

```
User: Looking at buying a pressure washer to wash my car. Around $200.
  [delay: 0]

Hank: You already wash your car without one.
      What's wrong with the hose and bucket method?
  [delay: 800, typingDuration: 1200]

User: I wash every 2 weeks, Montreal winters destroy
      the paint. Grit gets stuck like glue.
  [delay: 1200]

Hank: A pressure washer won't stop winter from happening.
      How many car washes would $200 buy at the touchless
      place down the road?
  [delay: 800, typingDuration: 1800]

User: Around 10, not even a full winter. And I have
      my own garage so I don't freeze outside.
  [delay: 1500]

Hank: Alright, fine. Winter in Montreal is a warzone
      and you've actually thought this through. Just
      promise me you'll use it more than once a season.
  [delay: 800, typingDuration: 2000]

VERDICT: CASE CLOSED — APPROVED ($200)
  [delay: 1000]
```

**Tab 3 — Scented Candles ($45) — DENIED**
```
User: I want to buy some scented candles, $45 from
      this brand I saw on TikTok.
  [delay: 0]

Hank: TikTok told you to want these. TikTok also
      told you to want the last thing you barely used.
      What's different this time?
  [delay: 800, typingDuration: 1500]

User: But it makes me happy. Self care is important.
  [delay: 1200]

Hank: You're confusing self-care with retail therapy.
      Happiness isn't stored in pumpkin chai wax.
      You know this.
  [delay: 800, typingDuration: 1800]

User: ugh fine whatever
  [delay: 1500]

VERDICT: CASE CLOSED — DENIED ($45)
  [delay: 1000]
```

**Tab 4 — Gaming Monitor ($800) — DENIED (memory callback)**

The showcase for Hank's memory feature. Hank references the espresso machine conversation from Tab 1. The visitor just watched that tab — so when Hank calls it back, the connection is instant. This is the "wait, he *remembers*?" moment.

**This tab must always come after Tab 1 in the auto-cycle.** The callback only lands if the visitor has seen the espresso machine conversation first.

```
User: I want a new 4K gaming monitor. About $800.
  [delay: 0]

Hank: What's your current monitor failing at, exactly?
  [delay: 800, typingDuration: 1000]

User: It's only 1080p and I play competitive shooters.
      The clarity difference at 4K is huge.
  [delay: 1200]

Hank: A 1080p monitor worked fine for years. Now suddenly
      it's holding you back, right when shiny new 4K
      screens hit the market. Convenient timing.
  [delay: 800, typingDuration: 1800]

User: It's 5 years old and has ghosting issues.
      Games have gotten more demanding too.
  [delay: 1500]

Hank: Last week it was a $900 espresso machine.
      Now it's an $800 monitor. You're not upgrading,
      you're just shopping with extra steps.
  [delay: 800, typingDuration: 2000]

VERDICT: CASE CLOSED — DENIED ($800)
  [delay: 1000]
```

**Why these four:**
- Espresso machine = relatable, classic impulse buy, quick denial, shows Hank's sharp one-liners
- Pressure washer = the APPROVED example, but hard-won. User fights for 4 rounds with real arguments (Montreal winter, regular use, has a garage, math works out). Shows Hank is fair — you CAN win, but you have to earn it.
- Scented candles = female-coded purchase, low price point, TikTok-driven impulse. Shows Hank handles all categories without being patronizing. The "self-care vs retail therapy" line is sharp. Proves price isn't the issue — $45 gets denied because the reasoning is weak.
- Gaming monitor = the memory callback. Hank references the espresso machine from Tab 1 — "Last week it was a $900 espresso machine." The visitor just watched that conversation, so the callback clicks instantly. This is the differentiator — he's not a one-off chatbot, he builds a case file on you over time. Must auto-cycle after Tab 1 for the reference to land.

**Visual design:**
- Chat container styled like the real app (dark bg, message bubbles, HANK label in accent mono)
- Tabs above the chat window showing item + price (e.g. "Espresso Machine — $900")
- Verdict animates in at the end (same styling as real VerdictCard but simplified)
- Progress bar along the bottom during the pause between conversations (accent color)
- The whole thing should look like the real app. Visitors should think "oh, that's what it looks like."

---

### Section 3: How It Works

**Salvaged from Hopshelf's `HowItWorks.tsx`.** Same 3-step layout skeleton, different content.

```
01                       02                       03
Tell Hank what           Make your case.          You get a verdict.
you want to buy.                                  Usually "no."

Open a conversation.     Hank pushes back. You    When the case is closed,
Type the item.           push back harder. If     you see exactly how much
That's it.               your argument holds up,  you didn't spend — or
                         he'll come around.       didn't need to.
```

Numbers in DM Mono, accent color. Desktop: 3-column row. Mobile: stacked.

---

### Section 4: Your Scorecard

**Header:** `TRACK YOUR WINS`

A mockup of the stats/saved counter as it would look in the app. Not a global "users have saved $X" — that's fake at launch. Instead, show what YOUR counter will look like after using Hank.

```
┌──────────────────┐  ┌──────────────────┐
│                   │  │                   │
│  You've saved     │  │  That's           │
│     $2,847        │  │     114 hours     │
│  this year        │  │  of work          │
│                   │  │                   │
│  47 talked out of │  │  You kept.        │
│  3 approved       │  │                   │
│                   │  │                   │
└──────────────────┘  └──────────────────┘
```

Two cards side by side. Left is the dollar savings. Right is the work-hours equivalent — the gut punch version of the same number. $2,847 is abstract. 114 hours of your life is not.

This is an example mockup with placeholder numbers — styled like the real stats view in the app. The framing is aspirational: "this is what it looks like after a few months of using Hank."

Short line underneath: "Every denied purchase adds to your total. The app pays for itself."

---

### Section 5: Why Hank Works

**Header:** `WHY HANK WORKS`

**Left side (paragraph):**

Timers expire. Streaks are passive. Checklists are self-graded.

Hank makes you argue your case out loud. When you have to explain why you need a $900 espresso machine to someone who pushes back, you hear your own weak arguments. The impulse dies in the conversation, not after a timer.

**Right side (list with X icons):**

```
x  Timers
   You wait 24 hours and buy it anyway.
   The impulse was delayed, not killed.

x  Streaks
   Not buying something isn't an action.
   No engagement, no confrontation.

x  Checklists
   "Do I need this?" You check yes.
   "Can I afford it?" You check yes.
   You buy it.
```

Closes with a check icon: "Hank: A debate you have to win."

---

### Section 6: Free to Try

**Header:** `FREE TO TRY`

```
Every impulse buying app charges you before
you can try it. Hank lets you argue for free.

30 free messages. No credit card.
No subscription. No trial that expires.

If you run out, credit packs start at $1.99.
Buy what you need, when you need it.
```

Optional: show credit pack tiers (50/$1.99, 150/$4.99, 400/$9.99) as informational cards. No purchase action on the landing page.

---

### Section 7: Fair Warning

Top and bottom border — feels like a warning label.

```
Hank is not a therapist. Not a budgeting app.
Not gentle. Not supportive. Not encouraging.

He is a debate partner. Sarcastic, blunt, and
usually right. Like a friend who's better with
money than you are.

If you can't take the debate, don't sign up.
```

Last line gets slightly more weight. This is the personality filter.

---

### Section 8: Final CTA

Minimal echo of the hero. Last chance to convert.

```
Ask Hank

Tell him what you want to buy.

[Try it free]
```

One button. No "Sign in" here — this is for new users.

---

### Footer

**Salvaged from Hopshelf's `Footer.tsx`.** Same grid layout, adapted for Hank.

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  [icon] Ask Hank              Product       Legal        │
│  Tell him what you            Demo          Terms        │
│  want to buy.                 How It Works  Privacy      │
│  He pushes back.              Pricing       Contact      │
│                                                          │
│  ─────────────────────────────────────────────────────── │
│  © 2026 AskHank                            [mail icon]   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

- **Left (2 cols):** Logo + icon + tagline
- **Product column:** Scroll anchor links (Demo, How It Works, Pricing) — same as navbar
- **Legal column:** Terms of Service, Privacy Policy, Contact (mailto)
- **Bottom row:** Copyright + contact icon (mail). No social links until there's a presence to link to.
- Mobile: stacked single column

Legal pages (Terms, Privacy) are separate routes — required for launch but simple boilerplate. Contact is a mailto link.

---

## What This Page Deliberately Excludes

- **Social proof / testimonials.** No users yet. Don't fake it.
- **Live chat input for anonymous users.** Abuse vector, cost risk, dishonest if faked.
- **Video / screen recordings.** The auto-play demo replaces this need.
- **Separate pricing page.** Credit packs are informational only.
- **Legal pages.** Later task.
- **Canvas animations / background effects.** Hopshelf has `CarbonationBackground.tsx` (bubble animation). Hank doesn't need ambient effects — whitespace is the aesthetic.

---

## Open Questions

1. **Credit pack display in the pricing section — worth showing tiers visually?** It might anchor the price ("this is cheap") or distract from the "free" message. Currently just says "credit packs start at $1.99" in text. Decide once credits are built (Phase 4).

2. ~~**Should there be a "Saved $X by Hank users" counter eventually?**~~ Resolved — Section 4 shows a per-user mockup with dollars + work hours side by side.

3. ~~**The Hank logo/icon — should it appear in the hero?**~~ Resolved — yes. Icon in the navbar next to "Ask Hank" text, same pattern as Hopshelf's `HopshelfIcon` in `Navbar.tsx`. Uses `AskHankIcon.svg` at ~24-28px.

4. ~~**Auto-play conversation count — 3 or 4?**~~ Resolved — 4 tabs. Espresso machine, pressure washer, scented candles, gaming monitor (memory callback).
