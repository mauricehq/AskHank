/**
 * Card Content Density Calculator
 *
 * Returns individual size classes for each text element based on its length.
 * Only the elements that are too long get scaled down - others stay at full size.
 */

export type TextSize = "normal" | "compact" | "tight";

export interface CardTextSizes {
  heroSize: TextSize; // Item name
  insightSize: TextSize; // Excuse/reason
}

/**
 * Get the appropriate size class for the item name (hero text).
 */
function getHeroSize(item: string): TextSize {
  if (item.length > 28) return "tight";
  if (item.length > 18) return "compact";
  return "normal";
}

/**
 * Get the appropriate size class for the insight/excuse text.
 */
function getInsightSize(excuse: string): TextSize {
  if (excuse.length > 220) return "tight";
  if (excuse.length > 160) return "compact";
  return "normal";
}

/**
 * Calculate individual text sizes for each card element.
 * Only long elements get scaled down - others stay at full size.
 */
export function getCardTextSizes(
  item: string,
  excuse: string = "",
): CardTextSizes {
  return {
    heroSize: getHeroSize(item),
    insightSize: getInsightSize(excuse),
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
