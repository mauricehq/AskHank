# Why People Buy Things They Don't Need

Comprehensive research synthesis across behavioral psychology, consumer science, neuroscience, and market data. Conducted March 2026. Ten parallel research agents covering purchase regret, product abandonment, cognitive biases, impulse buying, aspirational purchases, deal-driven purchases, socially-driven purchases, and predictive modeling.

This document is the research foundation for Hank v2's questioning system. AskHank is not just for impulse buyers — it's for anyone about to make a purchase they'll regret.

---

## Executive Summary

**Impulse buying is one category. There are at least five distinct types of purchases that end up unused.**

| Type | Psychology | % of Bad Purchases | Key Signal |
|---|---|---|---|
| **Impulse** | Self-regulation failure, dopamine hit | ~40% of e-commerce | Speed of decision, emotional state |
| **Aspirational** | Fantasy self, symbolic identity | Unknown but massive | No existing routine, no past behavior |
| **Deal-driven** | Transaction utility addiction | 47% buy just because it's on sale | Would not buy at full price |
| **Social** | Conformity, influencer trust, status | 68% regret social media purchases | Can't justify without referencing others |
| **Emotional** | Retail therapy, mood regulation | 74% of emotional purchases → overspending | Elevated emotional state at purchase |

Each type has different psychology, different triggers, and different detection strategies. A one-size-fits-all approach misses most bad purchases.

**The single most important insight across all research: people systematically fail to consider what they're NOT seeing.** They don't consider opportunity costs, future regret, usage decay, cascade costs, or their own emotional state. Hank's job is to make invisible costs visible.

---

## 1. The Scale of the Problem

### How Much Goes Unused

- **80% of items people keep are never used** (organizing industry data, The Simplicity Habit)
- **Average American home contains ~300,000 items** (LA Times / professional organizer data)
- **82% of Americans' wardrobe items went unworn** in the past year (Rawshot AI)
- **67% of gym memberships go completely unused or rarely used** (Mirrors Delivered)
- **54.9% of people have at least one unused subscription** each month (Self Financial)
- **46.6% of readers accumulate books they never read** (tsundoku research)
- **27%+ of home exercise equipment is never used** — $5.3B in idle equipment (Mike G Hansen)
- Average UK household owns **~$1,000+ in unused kitchen gadgets** (Tap Warehouse / Ideal Home)
- **1 in 3 Americans pays for self-storage** — industry valued at $64B (StorageCafe)

### The Financial Waste

- **$282/month** average impulse spending per American ($3,381/year) (Capital One Shopping)
- **$71 billion** spent on social media-driven impulse buys in the past 12 months (Bankrate)
- **$849.9 billion** in U.S. retail returns projected for 2025 (MakeMyReceipt)
- **$1.3 billion/year** wasted on unused gym memberships (Finder)
- **$10.1 billion/year** wasted on unwanted gifts (RetailBoss)
- **$200/year per person** on unused subscriptions (CNET/Self.inc)
- UK consumers have **$46.7 billion** worth of unworn clothes in closets (UniformMarket)

### Regret Rates

- **82% of UK adults** have regretted a purchase (Skelton & Allwood, 2017, Ecological Economics)
- **56% of impulse purchases** are regretted (SimplicityDX, 2023)
- **68% of social media impulse buyers** regret at least one purchase (Bankrate)
- **Gen Z: 70.8%** regret rate — highest of any generation
- **Millennials: 70.1%** — second highest
- **44% of all consumers** regret impulse purchases (general surveys)

### Usage Decay Curves

The pattern is remarkably consistent across categories:

**Gym memberships:**
- 4% quit before January ends
- 14% gone by end of February
- 50% gone within 6 months
- 80% of January joiners quit within 5 months (IHRSA/Glofox)
- Only 18-20% attend regularly (Gymdesk)

**Fitness trackers/wearables:**
- 33% quit within the first month
- 75% of students stopped wearing after 4 weeks (ScienceDirect)
- 29-30% abandonment rate overall (Gartner)

**Clothing:**
- Garments worn only **7-10 times** before discard — 35% decline in 15 years (Earth.Org)
- People wear ~20% of their wardrobe 80% of the time (Pareto observation)

**The universal pattern:** Heavy use for 2-4 weeks, significant drop-off by 6 weeks, majority abandonment by 3-6 months. This applies to gym memberships, fitness trackers, kitchen gadgets, hobby equipment, and online courses alike.

---

## 2. The Five Types of Bad Purchases

### Type 1: Impulse Buying

**Definition:** An unplanned purchase made rapidly, preceded by exposure to a stimulus and a sudden, powerful buying urge. Distinguished from merely "unplanned" buying by emotional intensity and lack of deliberation. (Rook, 1987)

**The process:** Stimulus → Urge → Internal conflict → Self-regulation attempt → Resolution (buy or resist)

**Key mechanisms:**
- **Dopamine is released during anticipation, not upon receiving the item.** The browsing, considering, and imagining are the dopamine-rich moments. Having the item is the letdown. (Knutson et al., 2007, Neuron — fMRI study showing nucleus accumbens activation during product preference, 8-12 seconds before conscious decision)
- **Unpredictability amplifies dopamine release.** 2x more dopamine at 50/50 chance of reward vs guaranteed reward. This is why mystery deals, flash sales, and algorithmic discovery are so potent.
- **Self-regulation is a depletable resource.** After exerting willpower in other domains (resisting food, managing emotions, completing demanding work), people are more susceptible. Late-night shopping is more impulsive than morning shopping. (Vohs & Faber, 2007, Journal of Consumer Research)

**Who is most susceptible:** Everyone, under the right conditions. Neuroticism is the strongest Big Five predictor. Gen Z (41% self-report as impulse buyers) and Millennials (34%) show highest rates. Women higher on social media platforms; gender gap less pronounced in general shopping.

**What actually reduces impulse buying (meta-analytic evidence):**
- **Reflection/deliberation prompts** — Listing reasons for/against significantly reduces purchase impulsivity (experimental studies, replicated)
- **Implementation intentions** — "If I feel the urge, then I will [wait 24 hours]" — significantly reduces impulse buying (Burkard et al., 2020, N=120)
- **Goal reminders** — Simple reminder of financial goals before shopping significantly reduces impulsive spending (Stanford study)
- **Self-compassion** — RCT (N=191, 14-day intervention): significant decreases in impulse buying, maintained at 1-month follow-up. Mechanism: self-compassion → decreased materialism → enhanced self-control → reduced impulse purchases (Sun et al., 2023, Mindfulness)

**Key meta-analyses:**
- Iyer et al. (2020), JAMS: 231 samples, 75,000+ consumers — traits, motives, resources, marketing stimuli as key drivers
- Anoop (2025): 84 studies, 139,545 participants — situational stimuli strongest (ESr=0.477)
- Amos et al. (2014): 63 articles — dispositional factors > situational > demographic

**Citations:** Rook (1987); Vohs & Faber (2007) JCR; Knutson et al. (2007) Neuron; Iyer et al. (2020) JAMS; Anoop (2025); Amos et al. (2014); Moser et al. (2019) CHI; Burkard et al. (2020) EJM; Sun et al. (2023) Mindfulness; Morozova & Vlaev (2024) IJMR

---

### Type 2: Aspirational Purchases (Buying for the Fantasy Self)

**Definition:** Purchasing items for the person you want to become rather than the person you are. The guitar you'll "learn to play," the running shoes for the marathon you'll "train for," the cookbook for the meals you'll "make."

**This is potentially the single largest category of wasted consumer spending.**

**The academic frameworks:**
- **Possible Selves Theory** (Markus & Nurius, 1986) — People's ideas of what they might become function as incentives for future behavior and provide context for the current self
- **The Extended Self** (Belk, 1988, ~17,000 citations) — "You are what you own." Possessions become extensions of identity
- **Symbolic Self-Completion Theory** (Wicklund & Gollwitzer, 1982) — When people lack symbols of a desired identity, they acquire purchasable alternatives to complete their self-definition
- **Compensatory Consumer Behavior** (Mandel et al., 2017, Journal of Consumer Psychology) — Self-discrepancies drive consumer behavior through five coping strategies, including symbolic self-completion

**The devastating data:**
- **90% of new guitarists abandon the instrument within 12 months** (Fender CEO Andy Mooney). Of 1M new entrants/year in English-speaking countries, only 100K commit.
- **80% of January gym joiners quit within 5 months** (IHRSA)
- **3-15% completion rate** for online courses (MOOCs). 52% never participate at all.
- **46.6% of readers** accumulate books they never read
- Only **19% maintain fitness resolutions past 8 weeks** (CFT Fit)
- Exercise equipment is commonly used for **~6 weeks then abandoned** (Active.com)

**The critical mechanism — buying IS the progress:**
Gollwitzer et al. (2009, Psychological Science) found that announcing an intention or acquiring its symbols **actually reduces follow-through** because it provides a premature sense of completion. Owning the guitar makes you feel enough like a guitarist that motivation to practice decreases. The purchase substitutes for the work.

**The sequence is always the same:**
1. Excitement about the identity ("I'm going to be a guitarist / runner / painter")
2. Research and purchase of equipment (dopamine hit)
3. Brief initial use (1-6 weeks)
4. Decline as reality of skill acquisition sets in
5. Abandonment, guilt, item becomes furniture

**Fresh start moments amplify vulnerability:** New Year's, birthdays, new jobs, new relationships all create optimism about the future self. People who set resolutions expected to spend $4,700 on average to achieve their goals. 70% abandoned their resolution entirely. (Drive Research)

**The Diderot Effect cascades aspirational purchases:** One purchase creates dissatisfaction with related possessions. Buy a guitar → need an amp, case, picks, strap, tuner, stand, book. The first aspirational purchase is never just one purchase — it's the seed crystal for an ecosystem.

**The cruelest irony:** The purchase doesn't close the gap between actual and ideal self. When the item goes unused, it widens the gap, creating guilt that makes future aspirational purchases more likely.

**Citations:** Markus & Nurius (1986) American Psychologist; Belk (1988) JCR; Wicklund & Gollwitzer (1982); Gollwitzer et al. (2009) Psychological Science; Mandel et al. (2017) Journal of Consumer Psychology; Dai, Milkman & Riis (Fresh Start Effect)

---

### Type 3: Deal-Driven Purchases

**Definition:** Buying things you don't need because the price seems too good to pass up. Sales, discounts, Black Friday, clearance, coupons. The deal itself becomes the justification.

**This is NOT impulse buying.** People can spend weeks waiting for a sale on something they still don't need. The purchase is deliberate — the problem is that the decision criterion is "is this a good deal?" rather than "do I need this?"

**Transaction Utility Theory (Thaler, 1985, Marketing Science):**
Consumers derive two separate forms of utility:
- **Acquisition utility:** Value of the good relative to its price
- **Transaction utility:** Pleasure from the perceived quality of the deal itself — completely independent of whether you need the item

Transaction utility is powerful enough to make people buy things they don't need (positive transaction utility from a "bargain") AND prevent people from buying things they do need (negative transaction utility from feeling "ripped off").

**The data:**
- **47% of Americans** buy things simply because they're on sale, regardless of need (Clever Real Estate, 2024)
- **64% of consumers** make impulse purchases during holiday sales (Be Bold Digital)
- **83% of consumers** identify as bargain shoppers; **23% sometimes buy things they don't need** just because of the deal (Inc.)
- **67.5% of consumers** frequently boast about discounts — deal-finding is a competitive identity
- Conditional promotions ("Buy one for $8 or two for $12") reliably cause consumers to spend more than with no promotion at all (Johns Hopkins Hub)
- During recessions, deal-hunting increases total purchasing volume, not savings (NBER)
- Bulk buyers throw out more food than frequent shoppers — waste negates savings (Grist)
- **31.9% of food acquired** by American households is wasted (Penn State/ScienceDaily)

**The anchoring mechanism:**
- "Was $200, now $79" works because $200 establishes the reference point. All evaluation happens relative to that anchor.
- Tversky & Kahneman (1974): Even random numbers shift estimates by 20 percentage points
- Inflated listing prices result in final sale prices 3-18% higher than market-aligned listings (ResearchGate)
- J.C. Penney tried eliminating fake sales in 2012 — revenue plummeted 25%. Customers preferred the illusion.
- Knowing about anchoring does NOT reliably immunize you against it.

**The subscription trap:**
- "Only $9.99/month" = $120/year. Gourville (1998, JCR): "85 cents/day" framing got 52% donation rate vs 30% for "$300/year" (same amount)
- **54.9%** have at least one unused subscription each month
- **64.8%** forgot to cancel a trial before being billed
- Once payment becomes automatic, it psychologically disappears

**The "I'll find a use for it" rationalization:**
- 95% of purchase decisions are unconscious (Zaltman, Harvard Business School)
- The emotional/rational split is ~80/20. The rational reasoning comes after the emotional commitment
- "I'll find a use for it" is the rationalization, not the reason. If you didn't have a specific use before you saw the price, the price created the justification.

**Citations:** Thaler (1985) Marketing Science; Tversky & Kahneman (1974) Science; Ariely, Loewenstein & Prelec (2003); Gourville (1998) JCR; Frederick et al. (2009) JCR

---

### Type 4: Socially-Driven Purchases

**Definition:** Buying because of social influence — influencer recommendations, peer pressure, trend-following, status signaling, conformity. The purchase is about social positioning, not personal utility.

**The data:**
- **49% of consumers** make purchases because of influencer posts (Sprout Social, 2024)
- **74% of consumers** have purchased because an influencer recommended it (GRIN/BusinessWire, 2024)
- **68% of social media impulse buyers** regret at least one purchase (Bankrate)
- **35% of Gen Z** regret TikTok/Instagram purchases (Coresight Research, 2023)
- **62% of Gen Z** feel pressured to spend to keep up with others (LendingTree)
- **71.2% of social media purchases** happen when users stumble across something in their feed — discovery-driven, not need-driven (Statista)
- **Over 30% of online reviews** on major platforms are suspected fake (Fakespot). Fake reviews cost consumers ~$0.12 per dollar spent ($787.7B total in 2025) (NBER)

**Social comparison theory (Festinger, 1954):**
The fundamental drive to evaluate yourself by comparing to others. Applied to purchasing: household debt-to-disposable-income ratios increased from 60% (1980) to 104% (2003) — people use debt to maintain consumption relative to peers (World Bank).

**Conformity purchasing (Asch, 1951):**
~36.8% conform to obviously incorrect group consensus. Applied to purchasing: conformity peaks when there's visible usage within the group, the product is relevant to the group, the individual has low purchase confidence, and the item is non-necessary. Non-necessary items with visible group usage are the peak conformity zone.

**Status signaling:**
- Veblen goods: valued because they're exclusive, not because they function better
- Hedonic treadmill ensures happiness from status purchases is extremely short-lived
- Van Boven & Gilovich (2003, JPSP): Experiential purchases make people happier than material purchases. Experiences are more open to positive reinterpretation and contribute more to social relationships.

**The meta-signal for detection:** When challenged, socially-motivated buyers escalate their justifications rather than simplify them. A genuine need can be stated simply. A social rationalization requires an ever-growing chain of reasons because no single reason is strong enough.

**The strongest detection question:** "If nobody would ever see you with this, would you still want it?"

**Citations:** Festinger (1954); Asch (1951); Van Boven & Gilovich (2003) JPSP; Cialdini (2001); Schouten, Janssen & Verspaget (2020) Int'l Journal of Advertising; Salganik, Dodds & Watts (2006) Science

---

### Type 5: Emotional / Retail Therapy Purchases

**Definition:** Buying to regulate mood — stress, sadness, boredom, anxiety, celebration. The purchase is a coping mechanism, not an acquisition.

**The uncomfortable truth — it genuinely works short-term:**
Rick, Pereira & Burson (2014, Journal of Consumer Psychology) found that purchasing does temporarily restore a sense of control. This is precisely what makes it addictive. The mood boost is real but temporary; the financial impact is permanent; the underlying emotional need remains unaddressed.

**The data:**
- **63% of consumers** say emotions influence what they purchase (LendingTree)
- **95% of purchasing decisions** are subconscious (Zaltman, HBS)
- **74% of emotional purchases** lead to overspending (Rolling Out)
- **44% of emotional purchases** cause subsequent financial hardship and regret
- **37.62% of women** impulse buy when stressed vs 32.30% of men
- **32% of Gen Z** cite boredom as driver of unnecessary purchases (Motley Fool)

**The self-licensing mechanism ("I deserve it"):**
- Meta-analysis of 91 studies (Blanken, van de Ven & Zeelenberg, 2015): Moral licensing effect d=0.31
- Doing something "good" (exercising, working hard) creates psychological license to indulge
- People with low self-control distort memories of past self-control to license indulgence
- The premise is often true (you DID work hard). The conclusion doesn't follow (therefore THIS purchase is wise).

**The hot-cold empathy gap (Loewenstein, 1996):**
This operates even in non-impulse purchases. Shopping while excited/aspirational vs. using the product on a tired Tuesday evening — the emotional state at purchase systematically differs from the emotional state during ownership. Even careful research creates a mild hot state — intellectual engagement and anticipation create a gap with eventual mundane ownership.

**Citations:** Rick, Pereira & Burson (2014) JCP; Loewenstein (1996) OBHDP; Blanken et al. (2015) PSPB; Atalay & Meloy (2011) Psychology & Marketing

---

## 3. The Cognitive Biases That Drive Bad Purchases

Each bias has a specific counter-question that neutralizes it. These counter-questions form Hank's toolkit (detailed in the companion document: `hank-question-framework.md`).

### Optimism Bias / Planning Fallacy
**The bias:** Systematically overestimating how much you'll use a product. "I'll go to the gym 5 days a week."
**The evidence:** DellaVigna & Malmendier (2006, AER): Gym members who chose monthly contracts overpaid by 70% because they drastically overestimated attendance.
**Counter:** "How many times in the last month have you done [activity] without this product?"
**Citations:** Kahneman & Tversky (1979); Weinstein (1980) JPSP; Buehler, Griffin & Ross (1994) JPSP; DellaVigna & Malmendier (2006) AER

### Anchoring
**The bias:** The "original price" becomes the reference point. "Was $200, now $80" makes $80 feel like saving $120.
**The evidence:** Even random numbers influence willingness to pay. Ariely (2003): Social security number digits influenced auction bids.
**Counter:** "Ignore the original price. If this had always been $80 with no discount, would you buy it today?"
**Citations:** Tversky & Kahneman (1974) Science; Ariely, Loewenstein & Prelec (2003)

### Endowment Effect / Mental Ownership
**The bias:** Once you add to cart, save to wishlist, or configure a customizer, you feel psychological ownership. Not buying feels like a loss.
**The evidence:** Shu & Peck (2011, JCP): Merely touching products increased willingness to pay. Cart abandonment emails exploit this directly.
**Counter:** "Imagine you already owned this and someone offered to buy it from you for the purchase price. Would you sell it?"
**Citations:** Thaler (1980); Kahneman, Knetsch & Thaler (1990) JPE; Shu & Peck (2011) JCP

### Scarcity Bias
**The bias:** "Only 3 left!" / "Sale ends tonight!" creates urgency that short-circuits deliberation.
**The evidence:** Aggarwal, Jun & Huh (2011, Journal of Advertising): Scarcity specifically increases competitive arousal — fear of losing to other buyers.
**Counter:** "If this was available in unlimited quantities with no time pressure, would you still want it just as much?"
**Citations:** Cialdini (2001); Worchel, Lee & Adewole (1975) JPSP; Aggarwal et al. (2011) JA

### Present Bias / Hyperbolic Discounting
**The bias:** Overweighting current desire vs future regret. "Buy now, pay later" works by decoupling pleasure (immediate) from pain (distributed).
**The evidence:** O'Donoghue & Rabin (1999, AER): People are "naively present-biased" — they fail to predict their future selves will also prefer the present.
**Counter:** "It's 3 months from now. You're looking at this in your closet/garage. How do you feel about it?"
**Citations:** Laibson (1997) QJE; O'Donoghue & Rabin (1999) AER; Frederick, Loewenstein & O'Donoghue (2002) JEL

### The Diderot Effect
**The bias:** One purchase creates dissatisfaction with surrounding possessions, triggering a cascade. New couch → coffee table looks dated → new rug → new curtains.
**The evidence:** McCracken (1988) named it after Diderot's 1769 essay about a new robe that made everything else seem shabby.
**Counter:** "If you buy this, what else will you feel like you need to buy to match or complement it? Add up the total."
**Citations:** McCracken (1988) Culture and Consumption, Indiana University Press

### Social Proof / Bandwagon Effect
**The bias:** "Everyone has one" / "50,000 five-star reviews" — social proof overrides personal evaluation.
**The evidence:** Salganik, Dodds & Watts (2006, Science): In artificial markets, the same songs became hits or flops depending purely on whether early adopters were visible. Quality had surprisingly little predictive power.
**Counter:** "Forget what everyone else bought. What specific problem are you trying to solve?"
**Citations:** Cialdini (2001); Asch (1951); Burnkrant & Cousineau (1975) JCR; Salganik et al. (2006) Science

### Sunk Cost in Browsing
**The bias:** "I spent 3 hours researching, I should just pick one." Research time becomes a sunk cost that biases toward purchasing.
**The evidence:** Arkes & Blumer (1985, OBHDP): Established sunk cost effects. Training on the concept partially debiased subjects.
**Counter:** "The time you spent researching is gone whether you buy or not. If you started fresh with zero research, would you begin this purchase journey at all?"
**Citations:** Arkes & Blumer (1985) OBHDP; Staw (1976)

### Feature Creep Justification
**The bias:** "Since I'm already spending $400, what's another $150 for the Pro version?"
**The evidence:** Thompson, Hamilton & Rust (2005, JMR): Consumers prefer feature-rich products at purchase but are less satisfied after use because complexity creates frustration.
**Counter:** "List the premium features you'd actually use weekly. Be honest."
**Citations:** Simonson (1989) JCR; Thompson, Hamilton & Rust (2005) JMR; Iyengar & Lepper (2000) JPSP

### FOMO
**The bias:** Fear of missing a deal or a trend. Operates on price-FOMO and social-FOMO.
**The evidence:** Good & Hyman (2020, JMTP): FOMO increases purchase likelihood by reducing perceived risk of buying — fear of missing out overwhelms rational evaluation.
**Counter:** "What specifically will you miss if you don't buy this? Spell it out concretely."
**Citations:** Przybylski et al. (2013) CHB; Good & Hyman (2020) JMTP

### Authority Bias (Influencer Recommendations)
**The bias:** "MKBHD recommended it" — parasocial relationships create false authority.
**The evidence:** Schouten et al. (2020, IJA): Consumers fail to adjust for the commercial nature of influencer recommendations.
**Counter:** "Is this person paid to recommend things? Their recommendation isn't neutral."
**Citations:** Milgram (1963); Cialdini (2001); Schouten et al. (2020) IJA

### Mere Exposure Effect
**The bias:** Seeing an ad 20 times makes you "want" the product — familiarity misattributed as preference.
**The evidence:** Zajonc (1968, JPSP): Repeated exposure increases liking even without conscious recognition. Operates below conscious awareness.
**Counter:** "When did you first want this? Did the desire come from a need, or did it just appear gradually?"
**Citations:** Zajonc (1968) JPSP; Fang, Singh & Ahluwalia (2007) JCR

---

## 4. The Psychology of Purchase Regret

### Predicted vs Experienced Utility (Kahneman)

People systematically fail to maximize experienced utility because predicted utility is a poor guide:
- **The Impact Bias** (Wilson & Gilbert, 2003, 2005, 2013): People overestimate both intensity and duration of emotional reactions to purchases. Focalism — imagining the purchase as the center of your life — and Immune Neglect — not accounting for your own capacity to rationalize — drive the error.
- **Hedonic Adaptation** (Diener, Lucas & Scollon, 2006, American Psychologist): People adapt to material purchases faster than to experiences.
- **Material vs Experiential** (Van Boven & Gilovich, 2003): Experiential purchases make people happier because they're more open to positive reinterpretation, form a more meaningful part of identity, and contribute more to social relationships.

### Types of Regret

- **Action vs Inaction** (Gilovich & Medvec, 1995, Psychological Review): Actions (buying) cause more regret short-term but fade. Inactions (not buying) cause more regret long-term. This means buyer's remorse is hot but temporary.
- **Process vs Outcome** (Lee & Cotte, 2009, JBR): People can regret HOW they decided (too fast or too slow) independently from WHAT they got.
- **Maximizers vs Satisficers** (Schwartz et al., 2002, JPSP): Maximizers show r=.52 correlation with regret, r=-.25 with happiness, r=.34 with depression. The strongest personality predictor in the literature.

### Timeline of Regret

- Initial regret emerges within 1-2 days as dopamine fades
- Peak regret at days 3-7 for most purchases
- Smaller purchases resolve within 2-3 weeks
- Higher price tags intensify and extend regret 3-5x
- Positive social feedback cuts regret duration by up to 70%

**Citations:** Kahneman (2000); Wilson & Gilbert (2005, 2013); Gilovich & Medvec (1995) Psychological Review; Schwartz et al. (2002) JPSP; Lee & Cotte (2009) JBR; Skelton & Allwood (2017) Ecological Economics; Rosenzweig & Gilovich (2012) JPSP

---

## 5. The Predictive Model: Will This Purchase Collect Dust?

The research converges on reliable signals that distinguish used purchases from dust collectors. Ranked by predictive power:

### Tier 1: High-Confidence Predictors

**1. Routine Integration**
Does it replace something you already use, or require a new habit?
- Products adopted as direct replacements within existing habits have dramatically higher sustained usage (Wood et al., habit slips research)
- Habit stacking (attaching new behaviors to existing routines) shows 64% higher success rates (BPS)
- Creating entirely new routines fails the vast majority of the time
- **Signal:** "Replaces something I use daily" = high usage. "Requires building a new routine" = high abandonment.

**2. Past Behavior**
Have you bought similar things before? Did you use them?
- Past behavior increases variance explained from 36% to 53% for predicting future behavior (Ajzen, TPB)
- Well-practiced behaviors in stable contexts recur through habit strength. Behaviors in new contexts are much weaker predictors. (Ouellette & Wood, 1998, Psychological Bulletin)
- **Signal:** "I used the last one daily" = strong. "I bought a guitar 5 years ago and never learned" = anti-evidence.

**3. Use Case Specificity**
Can you say WHEN and WHERE you'll first use it?
- Implementation intentions (specific if-then plans) increase follow-through ~3x (Gollwitzer meta-analysis, d=0.65, N>8,000)
- Inability to state "I'll use it Tuesday at 6pm for [specific activity]" is a strong dust-collector signal
- **Signal:** "Every Tuesday and Thursday at 7pm" = high usage. "It would be nice to have" = dust.

**4. Emotional State**
Are you calm and deliberate, or elevated?
- 74% of emotional purchases lead to overspending (LendingTree)
- Hot-cold empathy gap (Loewenstein, 1996): Shopping state systematically differs from ownership state
- **Signal:** Calm, has wanted it across multiple emotional states = legitimate. Urgent, excited, stressed = caution.

### Tier 2: Strong Supporting Signals

**5. Purchase Trigger**
Friend's genuine recommendation > Genuine need recognition > Browsing/discovery > Ad/influencer > Deal/sale
- WOM drives 5x more sales than paid advertising with 37% higher retention (Buyapowa)
- 71.2% of social media purchases are discovery-driven, not need-driven (Statista)

**6. Replacement vs Addition**
Replacing broken/worn out = high usage. Adding with no existing pattern = high abandonment.
- Replacements inherit the usage pattern of the thing they replace
- Aspirational additions carry inflated expectations driven by imagination and novelty

**7. Social vs Intrinsic Motivation**
Buying for what you DO (intrinsic) vs how you APPEAR (extrinsic)
- Extrinsically motivated consumers exhibit lower life satisfaction, self-esteem, and self-actualization (Frontiers in Psychology, 2022)
- Status purchases promise social standing but deliver hedonic adaptation

**8. Desire Duration + Stability**
Wanted for weeks/months with stable, specific reasons = strong. Desire recently triggered and/or reasons keep shifting = weak.
- Cooling-off periods cut impulse buys by 30%+ for high-value items
- The key differentiator: has the desire survived multiple cooling-off periods, or been continuously re-inflamed by external triggers?

### Tier 3: Supplementary Signals

**9. Process Simulation**
Can walk through daily use steps fluently = positive. Can only describe exciting outcomes = negative.
- Zhao, Hoeffler & Zauberman (2007, JMR): Process simulation (imagining the steps) is more effective at predicting actual engagement than outcome simulation (imagining how great it'll be)
- Vivid outcome fantasy is actually a negative signal — suggests dopamine-driven wanting

**10. Research Effort**
Compared alternatives, can articulate choice rationale = positive. No research OR excessive research = negative.
- Some research indicates deliberation. Excessive research indicates maximizer mindset that paradoxically leads to lower satisfaction (Schwartz, 2002)
- Sweet spot: compared a few alternatives, can say WHY this one

**11. Effort Willingness**
"Would you drive 30 minutes to buy this?" = genuine desire signal
- Strips away frictionless online shopping and tests whether desire survives effort cost
- Effort justification (Festinger): Willingness to expend effort is a meaningful signal of genuine valuation

### The Dust-Collector Formula

A purchase is highly likely to collect dust when 3+ of these are present:
1. Requires creating a new habit (not replacing an existing product)
2. Person has a history of similar unused purchases
3. Use case is vague ("it would be nice to have")
4. Triggered by advertising, browsing, or a sale
5. Person is in an elevated emotional state
6. Motivation is primarily social/identity-based
7. Cannot walk through concrete daily usage process
8. Desire is recent (less than a week old)

---

## 6. What Actually Works: Evidence-Ranked Interventions

### Tier 1 — Strong Evidence, Large Effect

| Framework | Evidence | Effect Size | Mechanism |
|---|---|---|---|
| **Opportunity Cost Framing** | Meta-analysis, 39 studies, N=14,005 | d=0.22 | Making invisible alternatives visible. Purchase willingness dropped from 75% to 55%. (Frederick et al., 2009 JCR) |
| **Implementation Intentions** | Meta-analysis, 94 studies, N>8,000 | d=0.65 | "If I still want this in a week, I'll buy it." Automates self-control. (Gollwitzer & Sheeran, 2006) |
| **Pre-Mortem** | Replicated experimental | +30% failure identification | "Imagine you regret this. Why?" Activates richer causal reasoning. (Klein; Mitchell, Russo & Pennington, 1989) |
| **Consider the Opposite** | Replicated across domains | Significant debiasing | "Give me two reasons this might not be worth it." 2 reasons is optimal — 10 backfires. (Mussweiler, Strack & Pfeiffer, 2000 PSPB) |
| **Cooling-Off Periods** | Multiple mechanisms validated | 30%+ reduction | 24 hours for <$100, 48-72 hours for $100-$500, 30 days for significant purchases |

### Tier 2 — Good Evidence, Situational

| Framework | Evidence | Best For |
|---|---|---|
| **Cost-Per-Use** | Direct experimental (Eckmann et al., 2026, Psychology & Marketing) | Durable goods, clothing, tools |
| **10-10-10 Rule** | Strong underlying mechanisms (Construal Level Theory) | Emotional/aspirational purchases |
| **Reference Class Forecasting** | Nobel-level theory (Kahneman) | Repeat purchase categories |
| **Work-Hours Reframe** | Supported mechanisms | Mid-range discretionary ($50-$500) |
| **"Where Will This Live?"** | Mental simulation research | Physical goods |

### Tier 3 — Weak Evidence or Easily Gamed

| Framework | Problem |
|---|---|
| **"Already Own" Test** | Strong theory, no direct validation |
| **"Does It Add Value?"** | Too vague, easily answered "yes" |
| **Need vs Want** | Easily rationalized, adversarial to challenge |
| **Pros/Cons Lists** | Confirmation bias built into the process |

---

## Sources (Consolidated)

### Psychology & Behavioral Science
- Ajzen — Theory of Planned Behaviour. Psychology & Health.
- Amos et al. (2014). Meta-analysis of consumer impulse buying.
- Arkes & Blumer (1985). Psychology of Sunk Cost. OBHDP.
- Ariely, Loewenstein & Prelec (2003). Coherent Arbitrariness. JEBO.
- Atalay & Meloy (2011). Retail Therapy. Psychology & Marketing.
- Belk (1988). Possessions and the Extended Self. JCR.
- Blanken, van de Ven & Zeelenberg (2015). Moral Licensing Meta-Analysis. PSPB.
- Buehler, Griffin & Ross (1994). Planning Fallacy. JPSP.
- Burkard et al. (2020). If-then plans and impulse buying. EJM.
- Cialdini (2001). Influence: Science and Practice.
- Dai, Milkman & Riis. Fresh Start Effect.
- DellaVigna & Malmendier (2006). Paying Not to Go to the Gym. AER.
- Diener, Lucas & Scollon (2006). Beyond the Hedonic Treadmill. American Psychologist.
- Festinger (1954). Social Comparison Theory.
- Festinger (1957). Cognitive Dissonance Theory.
- Frederick et al. (2009). Opportunity Cost Neglect. JCR.
- Frederick, Loewenstein & O'Donoghue (2002). Time Discounting. JEL.
- Gilovich & Medvec (1995). Temporal Pattern of Regret. Psychological Review.
- Gollwitzer & Sheeran (2006). Implementation Intentions Meta-Analysis. European Review of Social Psychology.
- Gollwitzer et al. (2009). When Intentions Go Public. Psychological Science.
- Good & Hyman (2020). Fear of Missing Out. JMTP.
- Iyer et al. (2020). Impulse buying meta-analytic review. JAMS.
- Kahneman (2000). Experienced Utility and Objective Happiness.
- Kahneman & Tversky (1979). Prospect Theory. Econometrica.
- Kahneman, Knetsch & Thaler (1990). Endowment Effect. JPE.
- Klein. Pre-Mortem technique.
- Knutson et al. (2007). Neural Predictors of Purchases. Neuron.
- Laibson (1997). Golden Eggs and Hyperbolic Discounting. QJE.
- Lee & Cotte (2009). Buyer Regret Model. JBR.
- Loewenstein (1996). Out of Control: Visceral Influences. OBHDP.
- Mandel et al. (2017). Compensatory Consumer Behavior. JCP.
- Markus & Nurius (1986). Possible Selves. American Psychologist.
- McCracken (1988). Culture and Consumption. Indiana University Press.
- Mitchell, Russo & Pennington (1989). Back to the Future. JBDM.
- Morozova & Vlaev (2024). Differentiating unplanned and impulse. IJMR.
- Moser et al. (2019). Impulse Buying: Design Practices. CHI.
- Mussweiler, Strack & Pfeiffer (2000). Consider the Opposite. PSPB.
- O'Donoghue & Rabin (1999). Doing It Now or Later. AER.
- Ouellette & Wood (1998). Habit and Intention. Psychological Bulletin.
- Rick, Pereira & Burson (2014). Benefits of Retail Therapy. JCP.
- Rosenzweig & Gilovich (2012). Material vs Experiential. JPSP.
- Salganik, Dodds & Watts (2006). Artificial Cultural Market. Science.
- Schwartz et al. (2002). Maximizing vs Satisficing. JPSP.
- Shu & Peck (2011). Psychological Ownership. JCP.
- Skelton & Allwood (2017). Regretted Purchases. Ecological Economics.
- Sun et al. (2023). Self-Compassion and Impulse Buying RCT. Mindfulness.
- Thaler (1985). Mental Accounting. Marketing Science.
- Thompson, Hamilton & Rust (2005). Feature Fatigue. JMR.
- Tversky & Kahneman (1974). Judgment under Uncertainty. Science.
- Van Boven & Gilovich (2003). To Do or to Have. JPSP.
- Vohs & Faber (2007). Spent Resources. JCR.
- Weinstein (1980). Unrealistic Optimism. JPSP.
- Wicklund & Gollwitzer (1982). Symbolic Self-Completion Theory.
- Wilson & Gilbert (2005, 2013). Affective Forecasting / Impact Bias.
- Xiao, Golman & Loewenstein (2025). Aspirational Purchases. Carnegie Mellon / SSRN.
- Zajonc (1968). Mere Exposure Effect. JPSP.
- Zhao, Hoeffler & Zauberman (2007, 2011). Mental Simulation. JMR.

### Market & Consumer Data
- Anoop (2025). Online Impulse Buying Meta-Regression. 84 studies, 139,545 participants.
- Bankrate. Social Media Impulse Purchases survey.
- Capital One Shopping. Impulse Buying Statistics.
- Clever Real Estate (2024). Bad Spending Habits.
- Coresight Research (2023). TikTok purchase regret.
- Earth.Org. Fast Fashion Waste Statistics.
- Eckmann et al. (2026). Cost Per Wear. Psychology & Marketing.
- Fender CEO Andy Mooney. Guitar abandonment data.
- Finder. Unused gym memberships.
- Gartner. Wearable device abandonment.
- Glofox. Gym membership statistics.
- Gourville (1998). Pennies-a-Day. JCR.
- GRIN/BusinessWire (2024). Influencer purchase rates.
- IHRSA. Gym membership data.
- LendingTree. Overspending survey.
- MakeMyReceipt. Retail returns statistics.
- NBER. Recession deal-hunting and spending.
- Rawshot AI. Wardrobe statistics.
- Self Financial. Unused subscription data.
- SimplicityDX (2023). Impulse purchase research.
- Sprout Social (2024). Influencer Marketing Report.
- StorageCafe. Self-storage industry statistics.
- UniformMarket. Fast fashion statistics.

*Research conducted March 2026.*
