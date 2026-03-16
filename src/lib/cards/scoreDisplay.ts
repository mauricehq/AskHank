/**
 * Score display utilities for share cards.
 *
 * computeDisplayPercent: maps internal score → visual bar width (8–97%).
 * computePriceModifier: mirrors the Convex-side function for client use.
 *
 * IMPORTANT: computePriceModifier is duplicated from convex/llm/scoring.ts
 * because that module runs in the Convex server runtime and can't be imported
 * client-side. If the formula changes there, update it here too.
 */

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Convert a raw score + threshold multiplier into a display percentage (8–97).
 * Formula: 8 + (score / (43 * thresholdMultiplier)) * 82
 */
export function computeDisplayPercent(
  score: number,
  thresholdMultiplier: number,
): number {
  return Math.round(
    clamp(8 + (score / (43 * thresholdMultiplier)) * 82, 8, 97),
  );
}

/**
 * Price modifier — mirrors convex/llm/scoring.ts for client-side use.
 */
export function computePriceModifier(price: number | undefined): number {
  if (price == null || price <= 0) return 1.0;
  return clamp(1.0 + 0.3 * Math.log(price / 100), 0.6, 1.5);
}
