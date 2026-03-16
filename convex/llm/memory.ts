"use node";

import { formatRelativeDate } from "../lib/dates";

export interface PastConversation {
  _id: string;
  item?: string;
  category?: string;
  estimatedPrice?: number;
  createdAt: number;
  memoryReferenceCount?: number;
}

export interface MemoryNudge {
  conversationId: string;
  item: string;
  estimatedPrice?: number;
  dateLabel: string;
}

export function sanitizeForYaml(value: string): string {
  return value.replace(/"/g, "'");
}

/**
 * Select ONE past conversation to reference.
 * Called on turn 2+ when no nudge has been stored yet.
 * Filters to: valid item + category matches currentCategory + category is not "other".
 * Sorts by: lowest memoryReferenceCount first, then most recent createdAt.
 */
export function selectMemoryNudge(
  conversations: PastConversation[],
  currentCategory: string,
  timezone?: string,
  now: number = Date.now()
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
    dateLabel: formatRelativeDate(pick.createdAt, now, timezone),
  };
}

/**
 * Format the memory directive injected into the system prompt on stance softening.
 * Structured data so the LLM narrates in its own voice instead of parroting a sentence.
 */
export function formatNudgePrompt(nudge: MemoryNudge): string {
  const lines: string[] = [];
  lines.push("MEMORY:");
  lines.push(`  previous_item: "${sanitizeForYaml(nudge.item)}"`);
  if (nudge.estimatedPrice && nudge.estimatedPrice > 0) {
    lines.push(`  price: $${nudge.estimatedPrice}`);
  }
  lines.push(`  date: "${nudge.dateLabel}"`);
  lines.push("Weave one dry callback into your response. Don't parrot these fields — narrate them in your voice.");
  return lines.join("\n");
}
