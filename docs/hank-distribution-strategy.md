# Hank — Distribution Strategy

## Framing: Utility First, Entertainment Second

Hank is NOT a roast bot. It's NOT an entertainment app that happens to involve money. It's an impulse prevention tool that happens to be funny.

The spec says it from line one: "a spending guardrail disguised as an argument with a friend who's better with money than you are." The guardrail is the product. The personality is the delivery mechanism.

This distinction matters because it changes everything about distribution, retention, and how to evaluate success.

### Why the debate mechanism actually works

Every other impulse-buying tool fails for the same reason:
- **Timers expire.** You wait 24 hours and buy it anyway. The impulse wasn't killed, just delayed.
- **Streaks are passive.** Not buying something isn't an action. There's no engagement, nothing to make you confront WHY you want it.
- **Checklists are self-graded.** "Do I need this? Can I afford it?" You check yes/yes and buy it.

Hank is different because **the debate forces you to articulate your reasoning out loud.** When you have to explain to someone why you need a $1,200 espresso machine and that someone pushes back with specifics, you hear your own weak arguments. The impulse dies in the conversation, not after a timer. That's not entertainment — it's a therapeutic mechanism with a personality on top.

### Two distribution paths

| | Entertainment distribution | Utility distribution |
|---|---|---|
| **Channel** | TikTok, Reels, Twitter | Reddit, forums, SEO, ADHD communities |
| **Hook** | "This app roasted me" | "This is the only thing that stopped my impulse buying" |
| **Who shares** | Anyone who had a funny conversation | People whose behavior actually changed |
| **Conversion** | Low (watchers don't become users) | High (searchers become users) |
| **Retention** | Weak (entertainment wears off) | Strong (if it works, why stop?) |
| **Content type** | Funny screenshots | Testimonials, before/after spending |

The best outcome is both — entertainment gets Hank noticed, utility makes it stick. But if forced to pick ONE, utility-first is more durable.

**The killer testimonial isn't "Hank is hilarious." It's "I saved $2,000 this month because every time I was about to buy something stupid, I argued with Hank and realized I didn't need it."**

That post in r/nobuy or r/personalfinance would do more for sustained growth than any TikTok.

### What this means for the kill criteria

Don't just measure shares. Measure whether the product actually prevents purchases. If users are saving money and coming back at their next impulse moment, Hank works — even if nobody posts a TikTok. Viral sharing is a bonus, not the thesis.

---

## The Share Problem

Conversations are the product, but they're also long (6-8 exchanges typical) and text-heavy. A full conversation screenshot is unreadable on TikTok and too much for Instagram stories. The share artifact needs to be designed, not assumed.

---

## Two Formats, Two Contexts

### Format 1: Screen Recording (TikTok / Reels)

This is the primary viral format. Someone screen-records themselves using Hank in real time. The viewer watches the conversation unfold message by message.

**Why it works:**
- It's how every "look at this AI conversation" TikTok already works
- The real-time reveal creates tension (will Hank fold? will the user win?)
- The typing indicator adds natural pacing
- The verdict at the end is the payoff

**What you need to build: nothing.** This is user behavior, not a feature. Users screen-record their phone, post to TikTok. The app just needs to look good on camera — dark mode, clean bubbles, readable text, no visual clutter.

**What helps:**
- Typing indicator that creates anticipation (already built)
- Message animations that feel satisfying on video
- Verdict card animation at the end (the "CASE CLOSED" moment is the climax)
- Hide any UI chrome that distracts (debug bar, settings icons, sidebar)
- Consider a "clean mode" toggle that hides everything except the conversation for recording

### Format 2: Share Card (Twitter, Instagram Stories, iMessage)

This is the static share — a single image that captures the conversation's best moment. Not the full conversation. The highlight reel.

**The structure:**

```
┌─────────────────────────────────┐
│  ASK HANK                       │
│                                 │
│  "I want to upgrade my fridge   │
│   so my wife stops complaining" │
│                                 │
│  "You're treating appliances    │
│   like duct tape for your       │
│   marriage. That's a $30,000    │
│   bandaid for a conversation    │
│   you're avoiding."             │
│                                 │
│  ──────────────────────────     │
│  DENIED — Fridge ($1,000)       │
│  askhank.app                    │
└─────────────────────────────────┘
```

**Three elements only:**
1. The user's original ask (the setup)
2. Hank's best line (the punchline)
3. The verdict + item + price (the result)

Plus the app URL. That's it.

**Auto-selecting Hank's best line:**

The share button shouldn't show the full conversation. It should auto-pick Hank's highest-impact response. Heuristics for selection:
- The message that caused the user to back down (the turn before `user-backed-down` decision)
- The message with the most specific/personal callback
- The longest Hank response (usually the most detailed roast)
- The message that triggered a stance shift toward IMMOVABLE

If auto-selection is too complex for v1, let the user tap a Hank message to select it as the featured line on the card.

---

## The Verdict Card (Current)

The current verdict card shows:
- CASE CLOSED — DENIED/APPROVED
- Item + price
- Hank's closing line
- Share + New Conversation buttons

**Problem:** The closing line alone is the punchline without the setup. "Well, that was the cheapest therapy session you'll ever have" is great but has no context for someone who didn't see the conversation.

**Fix:** The share card (Format 2 above) adds the user's original ask as context. The verdict card in-app can stay as-is — it's the end-of-conversation UI. The share card is a separate artifact optimized for external audiences.

---

## What Makes Content Shareable

Not all Hank conversations will be share-worthy. The best ones have:

1. **A relatable setup.** "I want AirPods Max" — everyone's been there. Niche items don't spread.
2. **A specific roast.** "You're treating appliances like duct tape for your marriage" — personal, unexpected, funny. Generic "you don't need it" doesn't spread.
3. **An escalation.** The conversation goes somewhere unexpected. Fridge → car → therapy. The journey is the content.
4. **A satisfying ending.** User either concedes (satisfying for the viewer) or gets denied with a killer closing line.

Conversations that are just "Can I buy X?" / "No." / "Ok." are not shareable. The scoring engine's multi-turn requirement helps here — Hank asks questions and challenges, which forces the conversation to develop.

---

## Distribution Channels by Format

| Channel | Format | Why it works |
|---|---|---|
| **TikTok** | Screen recording | Real-time conversation reveal, 15-30 second videos, algorithmic discovery |
| **Instagram Reels** | Screen recording | Same as TikTok, different audience |
| **Twitter/X** | Share card image | Quote-tweet energy, "look what this app said to me" |
| **Instagram Stories** | Share card image | Quick tap-through, URL sticker to app |
| **iMessage/WhatsApp** | Share card image | "Look at this" friend-to-friend sharing |
| **Reddit** | Screenshot or share card | r/funny, r/nobuy, r/personalfinance, r/ADHD |

---

## The Founder-User Gap

Honest constraint: I'm not an impulse buyer. I rarely spend impulsively and when I do it's cheap. I won't feel the product the way a target user would. This means:

- I can't reliably judge whether a conversation "feels right" for the target user
- I need real impulse buyers testing the voice and scoring calibration
- The share card design needs to be tested with people who'd actually share, not just me

**Mitigation:** Get 10-20 real impulse buyers using it in the first week. Watch what they screenshot, what they share unprompted, and what they ignore. Let their behavior design the share artifact, not assumptions.

---

## Kill Criteria

Set before launch, not after. Two signals, not just one:

**Primary (utility):** Are users coming back? If people use Hank once and never return, the tool doesn't work. After 4 weeks, look at repeat usage — are users returning at their next impulse moment? Are "Saved $X" counters growing? If nobody uses it twice, the debate mechanism isn't preventing purchases. Move on.

**Secondary (distribution):** Is anyone sharing without being asked? Organic shares are a bonus, not the core thesis. But if both repeat usage AND sharing are zero after 4 weeks, there's nothing to build on. Move to the Nag App.

The product succeeds if it changes behavior. It scales if people also talk about it. Behavior change is the bar. Virality is the upside.

---

## Failure Scenarios and What Each Teaches

### Scenario 1: Nobody shares
Content isn't funny enough or conversations are too short. Lesson: skip content-first distribution for the Nag App, go straight to utility channels (ADHD communities, productivity forums).

### Scenario 2: Content spreads but nobody converts
People watch TikToks, laugh, don't sign up. "Virality comes from watching, not using." Lesson: entertainment distribution doesn't convert to product usage. Distribute the Nag App through need, not novelty.

### Scenario 3: People sign up but don't come back
Retention weakness was real, "Saved $X" wasn't enough. Confirms episodic products without daily triggers don't retain. Directly validates building the Nag App — the product with a built-in daily trigger.

### Scenario 4: It kinda works but doesn't grow
Small loyal base, some sharing, modest revenue. Keep Hank running on autopilot, build the Nag App as main focus.

**Every failure scenario makes the Nag App stronger.** Each one eliminates unknowns that would otherwise take months to discover.

**The real risk isn't a failed experiment. It's refusing to stop the experiment.**

---

## Implementation Priority

1. **Make the chat UI screenshot-worthy.** Dark mode, clean bubbles, no visual noise. This is free and immediate.
2. **Build the condensed share card.** User ask + best Hank line + verdict. Single image, auto-generated on share tap.
3. **Consider "clean mode"** for screen recording — hides sidebar, debug bar, everything except the conversation.
4. **Don't build video export, auto-scroll replay, or anything fancy.** Users will screen-record. Let them.
