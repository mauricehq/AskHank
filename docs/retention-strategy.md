# Retention Strategy

Research from multi-angle exploration (gamification, shareability, habit loops, evolving difficulty). Prioritized by impact and feasibility for an early-stage product.

## Build Now

### 1. Verdict Card (Shareable Artifact)
Styled card generated after every conversation. Contains: item name, price, verdict (Denied/Approved), Hank's best pull-quote, score. One-tap share to clipboard/native share sheet.

- **Why:** Wordle-grid equivalent for impulse buying. Self-contained, funny, doesn't require audience to know AskHank. Captures the moment of highest emotional activation (right after verdict).
- **Design:** Minimal, dry, matches Hank's voice. No gradients or celebration. Like a bureaucratic form that rejected your loan. Subtle watermark, no app store links in image.
- **"Denied" vs "Approved" asymmetry:** Being denied is funnier to share. Being approved creates FOMO ("what argument worked?"). Both shareable for different reasons.
- **Implementation:** Static image via `satori` or html-to-image. One button on verdict screen. Copy line button on each Hank message with "— Hank, AskHank.ai" suffix.

### 2. Cross-Conversation Memory ("Pattern Witness")
Hank builds a persistent user profile from past conversations. Injected into system prompt as context.

- **What to track:** Top categories, recent items, dominant emotional triggers, conversation count, approval rate, last 3-5 conversation summaries (item, verdict, category, price).
- **How Hank uses it:** "You're in the electronics section again." / "You asked about headphones last month. Still have those?" — patterns, not specifics.
- **The creepiness line:** Patterns are fine ("you buy a lot of electronics"). Specifics are not ("on March 3rd you wanted a Sony camera"). The former feels like a friend. The latter feels like surveillance.
- **Implementation:** User profile table or fields on users. Aggregation mutation runs after conversation closes. New system prompt section activates after 3+ conversations.
- **Unlocks:** Adaptive difficulty, category hot spots, streaks — all build on this data layer.

### 3. "Consulted Hank" Streak + Weekly Summary
Streak measures "talked to Hank before buying," NOT "bought nothing." Users who consult Hank and then buy (with approval or conscious override) keep their streak.

- **Why this framing:** Binary "no purchases" punishes legitimate buys and creates churn. Behavior-based streaks reward returning to the app, which you control.
- **Weekly push:** Sunday notification — "This week you questioned $X in purchases. You kept Y, skipped Z." Informative, not nagging.
- **Hank references it in character:** At 5: "Five for five. You're getting better at this." At 10: "I've met people who buy every time. You're not one of them."
- **Loss aversion:** The streak gives a reason to open the app even when not shopping — to protect the number.
- **Implementation:** `hankListenedStreak` integer on user profile. Updated by post-conversation mutation. Convex scheduled function for weekly push.

## Build Next (needs memory layer first)

### 4. Adaptive Difficulty
Track user's approval rate and argument sophistication. As approval rate exceeds 25%, tighten thresholds via per-user `skepticismModifier` (e.g., 1.0x new users, 1.2x sophisticated users).

- **Why:** Prevents "I've cracked the code" plateau. Users who learn to game the system (always say it's broken, always claim evidence) face a Hank who's seen that playbook.
- **Prompt-level:** "This user is a skilled arguer. Require genuinely novel evidence for stance transitions."
- **Escalating probes:** New users get "What's wrong with what you have?" 15-conversation users get "You said the same thing about your last laptop."

### 5. Category Hot Spots
Using existing `category` data, identify each user's impulse weak spots. Hank's opening posture adjusts when a conversation opens in a hot category.

- **Nearly free once memory is built.** Pure prompt engineering on top of aggregated user history.
- **Example:** Electronics user on 8th electronics conversation: "You're back in the electronics aisle. The last thing on this list — you still using it?"

### 6. "Did You End Up Buying It?" Follow-Up
48 hours after conversation closes, single notification: "Hey — did you buy that air fryer?" One tap yes/no.

- **Closes the feedback loop.** Tells user whether Hank actually changed their behavior. Tells product whether Hank prevents purchases or just delays them.
- **Feeds into saved-money tracking and streak calculations.**

## Consider Later

### 7. Hank Modes (Strict / Standard / Blunt)
User-selected difficulty. Default is current Hank. Strict is harder thresholds. Blunt is a rougher voice variant.

- **Blunt Hank as content play:** "Blunt Hank destroyed me" is better TikTok than "Standard Hank was firm." Drives shares more than daily usage.
- **Strict as identity:** "I use Strict Hank" becomes a signal. Dark Souls equivalent. Speedrun community potential.
- **Monetization hook:** Strict/Blunt could be credit-pack features.
- **Implementation:** Per-user `mode` field, maps to `skepticismModifier` and prompt variant. Low engineering cost, but premature before validating core retention.

### 8. iOS Share Extension
When user sees a product on mobile, tap Share > "Ask Hank" opens conversation pre-loaded with product URL/name/price via Open Graph.

- **Intercepts the natural impulse gesture.** Near-zero friction. Single extra tap in the purchase flow.
- **Requires mobile app** (React Native/Expo share extension). Not applicable to web-only.

### 9. Browser Extension
Chrome/Firefox extension detects checkout pages (Amazon, Target, etc.) and injects a floating button: "Run this by Hank first?"

- **Friction insertion:** Any added step in checkout reduces conversion 10-20%. Hank doesn't need to be persuasive every time — just present.
- **Separate codebase to maintain.** Week 2-3 work.

## Skip

- **Leaderboards:** Require user base, punish people in financial stress.
- **Daily challenges:** Push notification spam. No connection to real temptation.
- **Achievement badges:** Gimmicky. Exception: "First Hank Approval" and milestone streaks.
- **Public conversation feed:** Moderation nightmare at low scale.
- **Referral codes:** Too transactional. Share motivation is emotional, not economic.

## Key Insight

The verdict card drives new users in. Cross-conversation memory makes them stay. The streak gives them a reason to come back between impulse moments. Everything else amplifies these three.

Win rate should be framed as a count ("You've beaten Hank 2 times"), not a percentage. Percentages feel like grades. Counts feel like trophies.
