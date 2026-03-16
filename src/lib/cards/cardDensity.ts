/**
 * Card Content Density Calculator — v2
 *
 * Returns individual size classes for each text element based on its length.
 * Only the elements that are too long get scaled down — others stay at full size.
 *
 * v2 changes: product name is smaller than v1's hero, quote is shorter —
 * thresholds tightened accordingly.
 */

export type TextSize = "normal" | "compact" | "tight";

export interface CardTextSizes {
  heroSize: TextSize; // Product name
  insightSize: TextSize; // Quote text
}

/**
 * Get the appropriate size class for the product name.
 * v2: product text is smaller than v1 hero — tighter thresholds.
 */
function getHeroSize(item: string): TextSize {
  if (item.length > 24) return "tight";
  if (item.length > 15) return "compact";
  return "normal";
}

/**
 * Get the appropriate size class for the quote text.
 * v2: quote box is more compact — tighter thresholds.
 */
function getInsightSize(insightText: string): TextSize {
  if (insightText.length > 160) return "tight";
  if (insightText.length > 100) return "compact";
  return "normal";
}

/**
 * Calculate individual text sizes for each card element.
 * Only long elements get scaled down — others stay at full size.
 */
export function getCardTextSizes(
  item: string,
  insightText: string = "",
): CardTextSizes {
  return {
    heroSize: getHeroSize(item),
    insightSize: getInsightSize(insightText),
  };
}

/**
 * Convert a TextSize to a CSS class suffix.
 * Returns empty string for 'normal' (use base class).
 */
export function sizeToClass(size: TextSize): string {
  if (size === "tight") return "-tight";
  if (size === "compact") return "-compact";
  return "";
}
