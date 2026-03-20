"use node";

import { formatRelativeDate } from "../lib/dates";
import type { Territory } from "./compass";

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
 * Delegates to selectMemoryNudges and returns the top pick.
 */
export function selectMemoryNudge(
  conversations: PastConversation[],
  currentCategory: string,
  timezone?: string,
  now: number = Date.now()
): MemoryNudge | null {
  return selectMemoryNudges(conversations, currentCategory, timezone, now)[0] ?? null;
}

/**
 * Select up to 3 past conversations to reference.
 * Same filtering/sorting as selectMemoryNudge, returns first 3.
 */
export function selectMemoryNudges(
  conversations: PastConversation[],
  currentCategory: string,
  timezone?: string,
  now: number = Date.now()
): MemoryNudge[] {
  if (!currentCategory || currentCategory === "other") return [];

  const candidates = conversations.filter(
    (c) =>
      c.item &&
      c.item !== "unknown" &&
      c.category &&
      c.category !== "other" &&
      c.category === currentCategory &&
      (c.decision === "skipping" || c.decision === "buying")
  );

  if (candidates.length === 0) return [];

  candidates.sort((a, b) => {
    const refA = a.memoryReferenceCount ?? 0;
    const refB = b.memoryReferenceCount ?? 0;
    if (refA !== refB) return refA - refB;
    return b.createdAt - a.createdAt;
  });

  return candidates.slice(0, 3).map((pick) => ({
    conversationId: pick._id,
    item: pick.item!,
    estimatedPrice: pick.estimatedPrice,
    decision: pick.decision as "buying" | "skipping",
    reactionText: pick.reactionText,
    dateLabel: formatRelativeDate(pick.createdAt, now, timezone),
  }));
}

const TERRITORY_GUIDANCE: Partial<Record<Territory, string>> = {
  pattern: "Name the pattern — dates, amounts, decisions.",
  real_cost: "Reference what they've already spent in this category.",
  alternatives: "Ask what changed since they last looked at alternatives.",
  trigger: "Their last similar purchase was emotional. Probe whether this one is too.",
  emotional_check: "Their last similar purchase was emotional. Probe whether this one is too.",
};

/**
 * Format the memory directive injected into the system prompt.
 * Accepts a single nudge (backward compat) or array of nudges with optional territory.
 */
export function formatNudgePrompt(nudge: MemoryNudge): string;
export function formatNudgePrompt(nudges: MemoryNudge[], territory?: Territory | null): string;
export function formatNudgePrompt(
  nudgeOrNudges: MemoryNudge | MemoryNudge[],
  territory?: Territory | null,
): string {
  const nudges = Array.isArray(nudgeOrNudges) ? nudgeOrNudges : [nudgeOrNudges];
  if (nudges.length === 0) return "";

  const lines: string[] = [];

  for (let i = 0; i < nudges.length; i++) {
    const nudge = nudges[i];
    const label = nudges.length === 1 ? "MEMORY" : `MEMORY_${i + 1}`;
    lines.push(`${label}:`);
    lines.push(`  item: "${sanitizeForYaml(nudge.item)}"`);
    if (nudge.estimatedPrice && nudge.estimatedPrice > 0) {
      lines.push(`  price: $${nudge.estimatedPrice}`);
    }
    lines.push(`  date: "${nudge.dateLabel}"`);
    lines.push(`  outcome: ${nudge.decision}`);
    if (nudge.reactionText) {
      lines.push(`  what_you_said: "${sanitizeForYaml(nudge.reactionText)}"`);
    }
  }

  // Territory-specific guidance for how to use the memory
  const territoryGuidance = territory ? TERRITORY_GUIDANCE[territory] : null;
  if (territoryGuidance) {
    lines.push(territoryGuidance);
  }

  lines.push("Reference once, naturally, in your own words. Do not invent details. Skip if forced.");
  return lines.join("\n");
}
