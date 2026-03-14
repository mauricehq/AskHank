# Hank Browser Extension — v2 Concept

## The Idea

A Chrome extension that intercepts checkout flows on retail sites and triggers a Hank conversation before the user can complete a purchase. Instead of the user remembering to open Hank, Hank finds them.

v1 (web app): User has impulse > remembers Hank exists > opens app > argues.
v2 (extension): User has impulse > adds to cart > hits checkout > Hank appears.

The extension removes the self-awareness requirement. Users don't need to choose to seek friction. The friction finds them.

---

## Why This Matters

The web app's real competitor is "I'll just buy it." That wins every time the user forgets Hank exists or doesn't bother opening it. The extension eliminates that failure mode entirely.

Think of it as an ad blocker for your wallet.

---

## How It Works

### Detection

The extension monitors the active tab for checkout signals:
- URL patterns: `/checkout`, `/cart`, `/payment`, `/order`, `/buy`
- Button text: "Place order", "Buy now", "Complete purchase", "Pay now", "Proceed to checkout"
- DOM patterns: payment form fields (credit card inputs, billing address)
- Known site-specific selectors (Amazon "Buy Now", etc.)

Detection should be conservative. Better to miss some checkouts than to trigger on every page with a "Buy" button. False positives will get the extension uninstalled fast.

### Trigger

When a checkout is detected:
1. Extension injects a slide-in panel (bottom-right or sidebar overlay)
2. Panel shows Hank with the detected item/price pre-filled if possible
3. User can: argue with Hank, dismiss ("I already thought about this"), or snooze ("ask me again in 24h")
4. Dismissing or snoozing logs the event for the "Saved $X" counter
5. If user concedes (decides not to buy), log the save

### What the Panel Looks Like

Minimal. Not a full chat UI. More like:
- Hank's face/icon + one-liner ("A $349 espresso machine? You have a perfectly good coffee maker.")
- Quick reply chips: "I need it", "It's a gift", "I already decided", "Fine, you're right"
- Expand to full conversation if the user wants to argue
- "Don't ask about this site" option (allowlist)

### Data Flow

The extension is a thin client. All logic stays on the backend:

```
Extension detects checkout
  → Extracts item name + price from page (best effort)
  → Calls conversations.send() via Convex client
  → Receives Hank's response via real-time subscription
  → Renders in injected panel
```

No scoring engine in the extension. No LLM calls from the client. The extension is just a different entry point into the same Convex backend the web app uses. Same scoring, same voice, same conversation history.

### Auth

- User must be logged in to the web app first (Clerk session)
- Extension reads auth token from the web app's domain cookies or uses Clerk's Chrome extension auth flow
- Unauthenticated users see a "Sign in to Hank" prompt with a link to the web app
- Free tier: 3 intercepts/day (same as web app credits)
- Paid users: unlimited intercepts

---

## Site Coverage Strategy

### Phase 1: Pattern-based (launch)
Generic URL and DOM pattern matching. Works on most standard e-commerce sites without site-specific code.

### Phase 2: Top 20 sites (post-launch)
Custom selectors for: Amazon, Target, Walmart, Best Buy, Apple, Nike, Etsy, Wayfair, IKEA, Sephora, etc. Extract exact item name, price, and image from each site's DOM.

### Phase 3: Community-contributed (growth)
Let users submit selector patterns for sites the extension doesn't recognize. Review and merge into the extension's pattern database.

---

## User Controls

Users need to feel in control, not ambushed:
- **Allowlist:** "Never ask about this site" (e.g., groceries, work purchases)
- **Snooze:** "Don't ask about this item for 24h" (prevents nagging on considered purchases)
- **Quiet hours:** Disable during work hours or specific times
- **Threshold:** Only trigger for purchases above $X (e.g., $25, $50, $100)
- **Pause:** One-click disable for a session ("I'm buying gifts today")

---

## Monetization Angle

The extension could be the **free tier forever**. Free users get Hank at checkout, unlimited. The web app is where they go for:
- Full conversation history
- "Saved $X" lifetime counter
- Dossier / spending patterns
- Deeper arguments (extension is quick-hit, app is full debate)
- Share cards

Extension acquires users for free. Web app monetizes them.

Alternative: extension is a paid-only feature (part of a subscription). Less compelling for growth but simpler to implement.

---

## Technical Considerations

### Chrome Extension Architecture
- **Manifest V3** (required for Chrome Web Store)
- **Content script:** Injected into retail pages, monitors for checkout patterns, renders Hank panel
- **Service worker:** Manages Convex connection, auth state, allowlist sync
- **Popup:** Settings, login status, quick stats ("Saved $X this week")

### What's Already Reusable from v1
- Convex backend (conversations.send, scoring engine, LLM orchestration) — zero changes needed
- Auth (Clerk) — extension auth flow documented by Clerk
- Message types and conversation schema — same data model
- OpenRouter integration — same LLM, same prompts

### What's New
- Content script for checkout detection
- Injected panel UI (lightweight, not full React app)
- Site-specific selector database
- Allowlist/snooze state management
- Extension popup UI

### Risks
- **Anti-extension hostility:** Amazon and others actively detect and fight extensions. May need to be subtle about DOM injection.
- **Performance:** Content script must be lightweight. Can't slow down page loads on every site.
- **Chrome Web Store review:** Extensions that modify checkout pages may face scrutiny. Position clearly as user-initiated purchase reflection, not price manipulation.
- **Maintenance burden:** Site-specific selectors break when sites update their DOM. Need automated monitoring or community reports.

---

## When to Build This

Not now. Prerequisites:

1. v1 web app shipped and validated (people enjoy arguing with Hank)
2. Credit system and Stripe working (monetization proven)
3. Share cards driving viral content (distribution working)
4. Signal that users wish Hank was there at checkout ("I forgot to check with Hank before buying")

If all four are true, the extension becomes the obvious next move. If any are false, the extension won't save the product — it'll just intercept checkouts for an app nobody cares about.

---

## One-Line Pitch

"The extension that asks 'do you really need this?' right before you click Buy Now."
