"use node";

import { formatRelativeDate, formatWindowLabel } from "../lib/dates";

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
  categoryHistory?: {
    count: number;
    category: string;
    window: string;
  };
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

  // Compute category history from candidates within 90 days
  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
  const recentCandidates = candidates.filter(
    (c) => now - c.createdAt <= ninetyDaysMs
  );
  let categoryHistory: MemoryNudge["categoryHistory"];
  if (recentCandidates.length > 1) {
    const oldest = recentCandidates.reduce((o, c) =>
      c.createdAt < o.createdAt ? c : o
    );
    categoryHistory = {
      count: recentCandidates.length,
      category: currentCategory,
      window: formatWindowLabel(oldest.createdAt, now, timezone),
    };
  }

  return {
    conversationId: pick._id,
    item: pick.item!,
    estimatedPrice: pick.estimatedPrice,
    dateLabel: formatRelativeDate(pick.createdAt, now, timezone),
    categoryHistory,
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
  if (nudge.categoryHistory) {
    lines.push("  category_history:");
    lines.push(`    count: ${nudge.categoryHistory.count}`);
    lines.push(`    category: "${sanitizeForYaml(nudge.categoryHistory.category)}"`);
    lines.push(`    window: "${nudge.categoryHistory.window}"`);
  }
  lines.push("Weave one dry callback into your response. Don't parrot these fields — narrate them in your voice.");
  lines.push('Examples: "Wasn\'t it a $550 pair of headphones last time. Same energy, different gadget." / "You were here two weeks ago for an espresso machine. Starting to see a pattern."');
  return lines.join("\n");
}
