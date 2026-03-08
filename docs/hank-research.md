# "Do I Need This?" / AskHank — Competitive Research

## Summary

The impulse purchase prevention space is fragmented across friction tools, savings trackers, and questionnaire apps. Nobody has built an adversarial AI conversation as the core product. The gap is wide open.

---

## Direct Competitors (AI That Pushes Back on Purchases)

### Why Buy: Stop Impulse Buying
- Platform: iOS only
- Developer: Lukayn LTD
- Ratings: Not enough to display (too new)
- Price: $0.99/week or $1.99/month
- How it works: AI "Smart Need Analysis" asks about necessity, frequency of use, alternatives owned, long-term value. Includes 24-hour cooling room and savings calculator.
- **Gap:** Analytical, not adversarial. Neutral evaluator. Asks questions but doesn't push back or argue. No personality.

### Quit Impulse Buying
- Platform: iOS (also Mac, Apple Vision)
- Ratings: 5.0 (1 rating — too new)
- Price: Free
- How it works: "Impulse Guard" AI chatbot. Upload photo or description, get pros/cons, practical questions, emotional check-ins. One-tap "Purchase" or "Save Money" buttons.
- **Gap:** Gives check-ins, not pushback. Supportive, not adversarial. No personality or voice.

### Cleo AI (adjacent, not direct competitor)
- Platform: iOS and Android
- Ratings: 4.5/5 lifetime (280K+ reviews)
- Revenue: $280M ARR (July 2025), $136M revenue in 2024
- Users: 5M+, targeting 35M MAU by 2030
- Funding: $175M across 11 rounds, $500M valuation
- 15 comedy writers on payroll for personality
- How it works: Chat-first AI finance assistant. Connects to bank. "Roast Mode" sarcastically calls out bad spending. "Can I afford..." queries answered with real financial data.
- **Key insight:** Cleo proved personality in finance works commercially. Roast mode virality doubled subscribers YoY.
- **Gap:** Roast mode is opt-in and retrospective (reviews past spending). Cannot argue about a specific future purchase in real time. Default stance is helpful, not adversarial. No "convince me" mechanic.
- **Warning:** FTC sued Cleo in March 2025 for misleading practices, settled for $17M.

---

## Friction Tools (Timers, Blockers, Cooldowns)

### Browser Extensions

| Extension | Mechanism | Price |
|-----------|-----------|-------|
| Icebox (Finder.com) | Replaces Buy buttons with cooldown (1-30 days) on 400+ sites | Free |
| Pause | 30-second mandatory block on 200+ shopping sites | Free |
| Checkout Chill | Dims screen at checkout, 3-question checklist | Free |
| CartBlocker | Blocks buy/cart/purchase buttons entirely | Free |
| Impause (v1) | "Do you really need this?" popup on shopping sites | Free |
| Impause (v2) | Shows purchase as investment opportunity cost over 5 years | Free |

### Mobile Apps

| App | Mechanism | Price | Rating |
|-----|-----------|-------|--------|
| UNCART | Screen Time integration, 14-day cooldown | $4.99-19.99/mo | Too new |
| Euna | Mandatory 24hr pause, trigger analysis, streaks | $9.99/mo | Too new |
| one sec | Deep breath animation before opening any configured app. 22% of users configure for shopping. Reduces usage by 57% (peer-reviewed). | Freemium | Popular |
| WaitWise | Wishlist with visual "waiting journey" indicator | Free/$0.99/mo | 5.0 (4 ratings) |
| SpendWise | 30/60/180/365-day waiting periods, import from Amazon/AliExpress | Free/$0.99-7.99 | 3.4/5 |
| BuyBye | Hours-of-life calculator, Shop Block, Cooldown | $27/yr | 3.68/5 |

### Price-to-Time Converters
- Time for Price — converts Amazon cart to working hours
- Time Well Spent — converts all prices on any website (covered by CNBC)
- TimeCost — converts to hours or days of work

---

## Savings Trackers ("Saved $X" Counter Apps)

| App | Platform | How it tracks savings |
|-----|----------|----------------------|
| Skip | Android | Log resisted purchases, running total |
| The Skip-It Savings | iOS | Virtual savings jar from skipped purchases |
| Quit Impulse Buying | iOS | Auto-logs every mindful decision with amount |
| Why Buy | iOS | Savings calculator from conscious decisions |
| Stop Impulse Buying | iOS/Android | Impulse Savings Tracker from "DON'T BUY" decisions |

**Also notable:** The "Notes App Hack" went viral — maintain an "Impulse Avoidance" list in Notes. Log what you almost bought. Total at month's end. One user saved $400/month with this low-tech approach.

---

## No-Spend Challenge Ecosystem

### Apps
- **Stop Impulse Buying** — most feature-complete. No-spend calendar, 52-week savings challenge, questionnaire. $9.99/mo or $49.99/yr. 4.4/5 (43 ratings).
- **Shopping Addiction Calendar** — sobriety-style counter, panic button, badges. 3.8/5 (9 ratings). Irony: shows shopping ads.
- **Quitzilla** — general addiction tracker, commonly used for shopping. 3.1M downloads, 4.67/5 (93K reviews). The most popular app in this adjacent space.

### Communities
- **r/nobuy** — 70K+ members. Central Reddit hub for no-buy movement.
- **r/shoppingaddiction** — support community for compulsive buying.
- **#NoBuy2025 / #NoBuy2026** — massive TikTok trend. Millions of views. Cultural moment.
- 60%+ of Americans living paycheck-to-paycheck driving interest in no-spend challenges.

---

## Devil's Advocate AI (General, Not Purchase-Specific)

### Academic/Research
- **Disagree Bot** (Duke University) — starts every reply with disagreement, provides reasoned counter-argument. Academic tool only, not a consumer product.
- **DebunkBot** (MIT/Cornell) — reduced conspiracy beliefs by 20% in 3 rounds of conversation, effects lasting 2+ months. Published in Science. Proves AI can change minds through pushback.

### GPT Store
- **Devil's Advocate GPT** — multiple versions, provides counterarguments to any viewpoint
- **Contrarian Opinion GPT** — analyzes statements, offers contrasting views
- **ZERO shopping-specific Devil's Advocate GPTs.** None tuned for purchases. The entire GPT Store shopping category is oriented toward helping you buy, not preventing buying.

### Apps
- **Nag Bot** — AI accountability partner. Nags about goals. More motivational coach than adversary.
- **Contrarian Bot (MiniApps)** — playfully disagrees with everything. Novelty, not a product.

### The "I Reprogrammed My AI to Disagree With Me" Experiment
Widely shared Substack piece where author set Claude's instruction to "CHALLENGE FIRST, SUPPORT SECOND." Found it dramatically more useful. Prompt engineering approach, not a product.

---

## The Sycophancy Problem (Why This Gap Exists)

Stanford/Carnegie Mellon/Oxford ELEPHANT benchmark tested 8 major LLMs:
- AI models offered emotional validation in **76% of cases** vs 22% for humans
- Models accepted user's framing in **90% of responses** vs 60% for humans
- Models endorsed inappropriate behavior in **42% of cases**

The entire AI industry is structurally incentivized to agree with users. An app that defaults to "no" fights against this. That's the novelty AND the technical challenge — the system prompt needs to override the model's natural sycophancy.

---

## Other Finance AI Apps With Personality

| App | Chat? | Personality? | Argues? | Pre-Purchase Friction? |
|-----|-------|-------------|---------|----------------------|
| Cleo | Yes | Strong (roast/hype) | Roasts past spending | No (reactive only) |
| Plum | Partial | Mild | No | No |
| Wally/WallyGPT | Yes | Neutral | No | No |
| Erica (BofA) | Yes | None (corporate) | No | No |
| Copilot Money | No | No | No | No |
| Monarch | Partial | No | No | No |

---

## What Does NOT Exist (The Gaps)

1. **No adversarial-by-default purchase AI.** Every app is analytical (neutral), supportive (cheerleader), or opt-in sassy (Cleo roast mode). Nobody defaults to "no."

2. **No "convince me" mechanic.** Zero apps where user builds a case and AI cross-examines. Not App Store, not GPT Store, nowhere.

3. **No viral TikTok content in this format.** "AI argues against your purchase" is an empty content category. Wide open.

4. **No shopping Devil's Advocate GPT.** Despite dozens of general ones, zero for purchases.

5. **No anti-sycophancy consumer product.** Academic research is extensive. Nobody's productized it.

6. **No Cleo-but-adversarial.** Cleo proved the model. Nobody's built the version where the pushback is the default, not a toggle.

---

## The #NoBuy Cultural Moment

The no-buy/no-spend movement is massive in 2025-2026:
- r/nobuy: 70K+ members
- TikTok: millions of views on #NoBuy2025, #NoBuy2026
- 60%+ of Americans living paycheck-to-paycheck
- Covered by Yahoo Finance, Vice, Quartz
- Spawned accountability groups, 30-day freezes, online communities

No app owns this moment with personality. The tools are checklists and timers. The community is on Reddit and TikTok. An AI with a voice that captures the #NoBuy energy could own this space.

---

## ADHD as a User Segment

Multiple sources (ADDitude Magazine, Tiimo) specifically address impulse buying as an ADHD challenge. Several tools (Impause, one sec) are built with neurodivergent users in mind. This is a significant, underserved audience that actively seeks friction tools.

---

## Key Takeaways

1. **The concept is validated by Cleo's success.** Personality in finance works. $280M ARR proves it.
2. **The adversarial stance is completely unoccupied.** Every tool is either neutral, supportive, or opt-in snarky.
3. **The #NoBuy movement is the distribution tailwind.** Cultural moment + no personality-driven app = opportunity.
4. **The "saved $X" counter exists everywhere** but nobody combines it with a conversational AI that earned those savings through argument.
5. **The technical challenge is real.** AI models default to agreeing. The system prompt has to fight the model's instincts.
6. **Friction tools are commoditized.** Timers and blockers are free browser extensions. The conversation is the defensible moat.

---

## Sources

- Why Buy — App Store
- Quit Impulse Buying — App Store
- Cleo — meetcleo.com, FinanceBuzz, Inc, Sifted, Sacra, BusinessWire
- Whistl — whistl.app
- Stop Impulse Buying — stopimpulse.com, App Store
- BuyBye — buybye.live, App Store, Google Play
- Euna — App Store
- UNCART — App Store
- WaitWise — App Store
- SpendWise — App Store, Google Play
- Skip — Google Play
- Skip-It Savings — App Store
- Shopping Addiction Calendar — App Store
- Icebox — Chrome Web Store
- Pause — pause.fyi, Chrome Web Store
- Checkout Chill — Chrome Web Store
- Impause (both versions) — Chrome Web Store
- CartBlocker — Chrome Web Store
- one sec — one-sec.app
- BlockSite — blocksite.co
- Freedom — freedom.to
- Quitzilla — quitzilla.com, Google Play
- Nag Bot — nag.bot
- Disagree Bot — Yahoo Tech
- DebunkBot — Science (journal), MIT Sloan
- ELEPHANT benchmark — MIT Technology Review
- AI sycophancy research — TechCrunch, seangoedecke.com
- r/nobuy, r/shoppingaddiction — Reddit
- NoBuy movement — Yahoo Finance, upfronttrading.com
- The Everygirl — Notes app hack
- ADDitude Magazine — ADHD impulse buying
- Devil's Advocate GPT — GPTsHunter, YesChat, CauseWriter
- Plum — withplum.com
- Wally — App Store
- Erica — Bank of America
