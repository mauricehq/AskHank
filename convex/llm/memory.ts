"use node";

import { formatRelativeDate } from "../lib/dates";

export interface PastConversation {
  _id: string;
  item?: string;
  category?: string;
  estimatedPrice?: number;
  decision?: "buying" | "skipping" | "thinking";
  reactionText?: string;
  createdAt: number;
  memoryReferenceCount?: number;
}

export interface MemoryNudge {
  conversationId: string;
  item: string;
  estimatedPrice?: number;
  decision: "buying" | "skipping";
  reactionText?: string;
  dateLabel: string;
}

export function sanitizeForYaml(value: string): string {
  return value.replace(/"/g, "'");
}

/**
 * Select ONE past conversation to reference.
 * Filters to: valid item + category matches currentCategory + category is not "other"
 * + conversation must have a decision of buying/skipping (only resolved conversations).
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
      c.category === currentCategory &&
      (c.decision === "skipping" || c.decision === "buying")
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
    decision: pick.decision as "buying" | "skipping",
    reactionText: pick.reactionText,
    dateLabel: formatRelativeDate(pick.createdAt, now, timezone),
  };
}

/**
 * Format the memory directive injected into the system prompt.
 * Structured data so the LLM narrates in its own voice.
 */
export function formatNudgePrompt(nudge: MemoryNudge): string {
  const lines: string[] = [];
  lines.push("MEMORY:");
  lines.push(`  item: "${sanitizeForYaml(nudge.item)}"`);
  if (nudge.estimatedPrice && nudge.estimatedPrice > 0) {
    lines.push(`  price: $${nudge.estimatedPrice}`);
  }
  lines.push(`  date: "${nudge.dateLabel}"`);
  lines.push(`  decision: ${nudge.decision}`);
  if (nudge.reactionText) {
    lines.push(`  reason: "${sanitizeForYaml(nudge.reactionText)}"`);
  }
  lines.push("Reference this once, naturally, in your voice:");
  if (nudge.decision === "skipping") {
    lines.push("- They walked away from this before. Use it to reinforce your skepticism.");
  } else {
    lines.push("- They made a real case last time. Acknowledge it, but the bar is still high.");
  }
  lines.push("Do not invent details beyond what's listed. Skip if it feels forced.");
  return lines.join("\n");
}
