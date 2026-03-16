# Share Card v2

Mockup: `docs/share-card-v2-mockup.html`

## Final Design Decisions

### Tagline
- **"Ask before buying"** — short, fits one line, doubles as CTA

### Stamp
- DENIED/APPROVED is the visual hero — huge, centered, all caps
- **"HANK SAYS NO"** / **"HANK SAYS YES"** below in accent color, all caps, with decorative lines

### Score
- **"Your case"** — scores the argument (0–100), not the user
- Progress bar visualization
- Positioned near the bottom, above askhank.app

### Copy
- Hard cap ~25 words. One killer line.
- Roasts need more bite: shorter sentences, no hedging, more specificity

## Formats

### Portrait (share card — IG story, Twitter, iMessage)
Top to bottom:
1. Ask Hank logo (top left)
2. DENIED/APPROVED stamp (hero, centered)
3. "HANK SAYS NO/YES" with accent lines
4. Product name + price
5. Hank's verdict quote (1–2 sentences max)
6. "Your case" score bar
7. Footer: "Ask before buying" (left) + "askhank.app" (right)

### Landscape (OG image — 1200×630)
Two-panel layout with vertical accent divider:
- **Left panel:** Logo, DENIED/APPROVED stamp, "HANK SAYS NO/YES", tagline
- **Right panel:** Product name + price, quote, score bar (bottom), askhank.app (bottom right)

## What Drove These Decisions

### Feedback synthesis (5-perspective review)
- DENIED/APPROVED binary mechanic creates natural conversation
- Dark/amber aesthetic is distinctive in feeds
- "askhank.app" is short and memorable
- The concept "AI told me not to buy this" is inherently shareable
- Score gives people something to compare — even on DENIED, high score = "I almost had him"
- Best share cards reflect the user's identity back (the score does this)

### Problems addressed
1. **Quotes too long** → hard cap ~25 words
2. **No tagline** → "Ask before buying"
3. **Badge too small** → now the visual hero
4. **No numeric element** → "Your case" score bar
5. **Roasts need more bite** → prompt work needed
6. **User not the protagonist** → score makes it about their performance

## Score Mapping

Internal score is unbounded and varies by price. Map to 0–100% display scale:

```
concedeThreshold = 43 * thresholdMultiplier
displayPercent = clamp(8 + (score / concedeThreshold) * 82, 8, 97)
```

- **Floor: 8%** — negative/zero scores never show 0
- **Ceiling: 97%** — Hank always has reservations
- Rough mapping by stance:
  - IMMOVABLE → 8–20%
  - FIRM → 20–40%
  - SKEPTICAL → 40–60%
  - RELUCTANT → 60–80%
  - CONCEDE → 80–97%

Source: `convex/llm/scoring.ts` has `score`, `thresholdMultiplier`, and `stance` already computed per turn.

