# Monetization — Credit System Design

## Decision: Per-Message Credits

**1 credit = 1 user message.** Credit packs are one-time purchases via Stripe, not subscriptions.

### Why Per-Message (Not Per-Conversation)

The original plan was 1 credit = 1 conversation. We explored this from cost, competitive, and behavioral angles and switched to per-message for these reasons:

**Conversation length is unpredictable.** The scoring engine has closure mechanisms (disengagement, stagnation, concession) but users can go long — casual chatting with Hank because they enjoy his character, switching topics mid-conversation, or building elaborate arguments across 15+ turns. Per-conversation pricing creates unbounded cost exposure per credit.

**Per-message is the industry standard.** ChatGPT, Poe, Character.ai, CrushOn.ai — every consumer AI app charges per message or per time window. Users already understand this model. Zero learning curve.

**Future-proofs for photo messages.** Phase 2 will add screenshot/photo support (vision model calls). These cost ~3x a text message. Per-message credits let us charge 3 credits for a photo message without redesigning the system.

**Eliminates conversation gaming.** With per-conversation credits, a user could start with "Should I buy AirPods?", get denied, then pivot to "What about a standing desk?" — getting multiple consultations for one credit. Per-message makes this a non-issue. They're paying for the interaction, not the container.

**At sufficient volume, friction disappears.** The concern with per-message credits was that users would ration messages and cut conversations short. But at 50 messages for $1.99, each message costs $0.04. Nobody rations that. The "friction per message" argument only applies at very low credit balances.

### Why NOT Per-Conversation

- Cost variance per conversation is huge (3-turn vs 30-turn = 10x cost difference)
- Heavy users get subsidized by light users
- Users can game conversations by switching topics
- Hard to price correctly without knowing median conversation length (we have no data yet)

### Why NOT Subscriptions

- AskHank usage is sporadic — people don't impulse-shop every day
- Subscriptions create "am I getting my money's worth?" anxiety for low-frequency tools
- Credit packs feel casual and low-commitment, matching the product's tone
- No "grandfathered tier" problem when adjusting pricing later

---

## Pricing Structure

### Free Tier: Starter Pack

New users receive **30 free messages** on signup. No daily reset — once they're gone, they're gone.

**Why starter pack, not daily free allowance:**
- AskHank isn't a daily-use app. Usage is sporadic (when you're about to buy something).
- A daily free allowance (e.g., 10 messages/day) means a sporadic user never pays — they show up once a week, always have free messages.
- The starter pack creates natural conversion pressure as the balance drops.
- 30 messages = approximately 5-6 complete conversations. Enough to get hooked on Hank's personality, build some "Saved $X" counter value, and generate shareable content.

### Paid Credit Packs

| Pack | Messages | Price | Per Message | Approx. Conversations |
|------|----------|-------|-------------|----------------------|
| Small | 50 | $1.99 | $0.040 | ~7-10 |
| Medium | 150 | $4.99 | $0.033 | ~20-30 |
| Large | 400 | $9.99 | $0.025 | ~55-80 |

Bulk discount incentivizes larger packs. All prices are in impulse-purchase territory.

### Photo Messages

Photo/screenshot messages cost **3 credits** each. Vision model calls cost roughly 3x a text-only call. Communicated clearly in the UI before sending.

---

## Cost Analysis (Claude Haiku 4.5)

The app uses Claude Haiku 4.5 via OpenRouter as the default model. Each user message triggers two LLM calls (tool call for assessment + text response).

### Per-Message LLM Cost

| Turn in Conversation | Input Tokens (both calls) | Output Tokens | Estimated Cost |
|---------------------|--------------------------|---------------|----------------|
| Turn 1 | ~5,400 | ~330 | $0.007 |
| Turn 5 | ~7,400 | ~330 | $0.009 |
| Turn 10 | ~9,200 | ~330 | $0.011 |
| Turn 15 | ~11,000 | ~330 | $0.013 |
| Turn 20 | ~12,800 | ~330 | $0.015 |

Average cost per message across a typical conversation: **~$0.009**

Cost increases per turn because the full conversation history is re-sent with each call. A sliding context window (Phase 3+) would cap this for long conversations.

### Margin Analysis

| Pack | Revenue | Stripe Fees | Net Revenue | LLM Cost (avg $0.009/msg) | Margin |
|------|---------|-------------|-------------|--------------------------|--------|
| 50 / $1.99 | $1.99 | $0.36 | $1.63 | $0.45 | **72%** |
| 150 / $4.99 | $4.99 | $0.44 | $4.55 | $1.35 | **70%** |
| 400 / $9.99 | $9.99 | $0.59 | $9.40 | $3.60 | **62%** |

Margins are healthy across all packs. Even accounting for some conversations running long (10-15 turns, pushing avg cost to $0.012/msg), margins stay above 50%.

### Cost Safety Net: Sliding Context Window

For conversations exceeding ~10 turns, implement a sliding context window to cap per-message cost:

- **Turns 1-8:** Full conversation history sent to LLM
- **Turns 9+:** System prompt + first message (item context) + last 6 messages only

This caps the worst-case per-message cost at ~$0.011 regardless of conversation length. The previous assessment JSON carries forward the context the LLM would otherwise need from old messages.

| Scenario | Full History Cost | With Sliding Window |
|----------|------------------|-------------------|
| 10-turn conversation | $0.08 | $0.08 (no difference) |
| 20-turn conversation | $0.20 | ~$0.11 |
| 30-turn marathon | $0.41 | ~$0.14 |

---

## Retention Strategy (Credits Are Not the Answer)

Credits should **convert**, not **retain**. Retention for a sporadic-use app comes from:

1. **"Saved $X" counter** — growing savings total gives users a reason to come back
2. **Push notifications** — "You almost bought those AirPods 2 weeks ago. Still glad you didn't?"
3. **User Dossier (Phase 7)** — Hank learns your patterns over time, creating a personal relationship
4. **Social proof** — friends sharing verdicts pulls users back in
5. **Banger System (Phase 8)** — engineers the screenshot-worthy moments that drive viral sharing

See `docs/retention-strategy.md` for the full retention design.

---

## Future Revenue: Affiliate Commerce (Post-Dossier)

Credit packs are launch monetization. Affiliate commerce is scale monetization — build it after the dossier (Phase 7) when Hank has real user context to make recommendations meaningful.

### The Model

When Hank approves a purchase (~10-15% of conversations), show affiliate buy links alongside the verdict card. The user just argued their case, got challenged on every angle, and won. This is one of the highest-intent moments in consumer commerce — conversion rates would be exceptional.

**On approvals:**
> CASE CLOSED — APPROVED
> Sony WH-1000XM5 ($399)
> "You wear headphones 6 hours a day. Buy them."
> [ Buy on Amazon ] [ Buy on Best Buy ]

**On denials (harder, higher value):**
> "Don't buy the $400 headphones. These $150 ones do the same thing."

The denial-with-alternative path requires product knowledge and comparison data — much harder to build but potentially more valuable.

### Why This Works for AskHank Specifically

- **Anti-spam framing.** Affiliate links only appear on approvals. Hank spent the whole conversation saying no. The buy link feels earned, not pushed. This is the opposite of every recommendation engine that pushes you to buy more.
- **Trust moment.** "Hank approved this" carries weight because Hank is hard to convince. The approval means something.
- **On-brand.** Even the affiliate link is Hank saving you money — "Buy it here, it's cheaper."
- **Pure margin.** No LLM cost, no credit cost. Affiliate commission is 3-8% depending on category.

### Why Not Now

- Requires product identification (what exactly is the user buying?)
- Requires affiliate network integration (Amazon Associates, etc.)
- Needs volume to be meaningful — at 100 users, affiliate revenue is pennies
- The dossier makes this better — Hank knows what you own, what you've tried, what you actually need
- Focus at launch is proving the core loop: ask Hank → enjoy it → share it

### What We Explored and Rejected

We consulted multiple AI models (Grok, Gemini, ChatGPT) on monetization strategy. Common suggestions and why we rejected them:

- **Subscriptions ($5-10/month)** — wrong for sporadic usage. AI apps churn annual subscribers ~30% faster than non-AI apps. Users who open the app twice a month won't keep paying monthly.
- **Multiple personalities ("Sarcastic Hank", "Gentle Hank")** — dilutes the brand. Hank's voice IS the product. You don't make 5 versions of a character people love.
- **Daily engagement features (morning roasts, daily questions)** — AskHank isn't a daily-use app. Forcing daily engagement would feel desperate. Retention comes from the Saved $X counter, dossier, and social sharing — not daily notifications.
- **Fintech integrations (savings accounts, bank connections)** — turns a fun personality app into a regulated financial product. Compliance nightmare, completely different business.
- **Gated features (brutal mode, history behind paywall)** — the free experience needs to be full Hank or the shareable content (growth engine) comes from a lesser product.

---

## Implementation Notes

### Schema (Convex)

```
credits table:
  userId: v.id("users")
  balance: v.number()        // total available messages (starter + purchased)
  totalPurchased: v.number() // lifetime purchased (for analytics)
  totalUsed: v.number()      // lifetime used (for analytics)
```

No need for separate `freeCreditsRemaining` or `lastFreeReset` fields — the starter pack is just an initial balance.

### Credit Flow

1. **New user signup** → create credits record with `balance: 30`
2. **User sends message** → deduct 1 from balance (3 for photo messages)
3. **Balance hits 0** → show "Out of credits" state with purchase CTA
4. **Stripe purchase** → webhook adds credits to balance

### Credit Check

Check happens when the user attempts to send a message, not when starting a conversation. This means:
- Users can always start a conversation (no upfront cost barrier)
- They pay as they go within the conversation
- If they run out mid-conversation, they see the purchase CTA and can buy more to continue

### What We Decided NOT to Do

- **Per-conversation credits** — unpredictable cost per credit, gaming via topic switching
- **Daily free allowance** — sporadic users never convert
- **Subscriptions** — wrong model for sporadic usage
- **Hard turn cap** — punishes engaged users, hurts shareability
- **Tiered free/paid within conversations** — creates a jarring cliff mid-conversation
