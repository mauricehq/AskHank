"use node";

export interface PastConversation {
  _id: string;
  item?: string;
  category?: string;
  estimatedPrice?: number;
  excuse?: string;
  createdAt: number;
  memoryReferenceCount?: number;
}

export interface MemoryNudge {
  conversationId: string;
  item: string;
  estimatedPrice?: number;
  excuse?: string;
  dateLabel: string;
}

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function formatShortDate(timestamp: number): string {
  const d = new Date(timestamp);
  return `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function sanitizeForYaml(value: string): string {
  return value.replace(/"/g, "'");
}

/**
 * Select ONE past conversation to reference in the opener.
 * Filters to: valid item + category matches currentCategory + category is not "other".
 * Sorts by: lowest memoryReferenceCount first, then most recent createdAt.
 */
export function selectMemoryNudge(
  conversations: PastConversation[],
  currentCategory: string
): MemoryNudge | null {
  if (!currentCategory || currentCategory === "other") return null;

  const candidates = conversations.filter(
    (c) =>
      c.item &&
      c.item !== "unknown" &&
      c.category &&
      c.category !== "other" &&
      c.category === currentCategory
  );

  if (candidates.length === 0) return null;

  // Sort: lowest ref count first, then most recent
  candidates.sort((a, b) => {
    const refA = a.memoryReferenceCount ?? 0;
    const refB = b.memoryReferenceCount ?? 0;
    if (refA !== refB) return refA - refB;
    return b.createdAt - a.createdAt;
  });

  const pick = candidates[0];
  return {
    conversationId: pick._id,
    item: pick.item!,
    estimatedPrice: pick.estimatedPrice,
    excuse: pick.excuse,
    dateLabel: formatShortDate(pick.createdAt),
  };
}

/**
 * Format the directive injected into the opener prompt.
 */
export function formatNudgePrompt(nudge: MemoryNudge, userName: string): string {
  const item = sanitizeForYaml(nudge.item);
  const priceStr =
    nudge.estimatedPrice && nudge.estimatedPrice > 0
      ? ` ($${nudge.estimatedPrice})`
      : "";
  const claimStr =
    nudge.excuse
      ? ` They claimed "${sanitizeForYaml(nudge.excuse).replace(/\.+$/, "")}."`
      : "";
  return `MEMORY — ${userName} came to you before about "${item}"${priceStr} (${nudge.dateLabel}).${claimStr} Work this into your opener — one natural callback, don't force it awkwardly.`;
}
