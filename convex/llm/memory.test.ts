import { describe, it, expect } from "vitest";
import { selectMemoryNudge, selectMemoryNudges, formatNudgePrompt, type PastConversation, type MemoryNudge } from "./memory";
import { buildCompassBlock } from "./prompt";
import { initCoverageMap, type StoredContradiction } from "./compass";

// Fixed reference time so all tests are deterministic (no Date.now() drift)
const NOW = Date.UTC(2026, 2, 13, 12, 0); // March 13, 2026 12:00 UTC

function makeConversation(overrides: {
  _id?: string;
  item?: string;
  category?: string;
  estimatedPrice?: number;
  decision?: "buying" | "skipping" | "thinking";
  reactionText?: string;
  memoryReferenceCount?: number;
  daysAgo?: number;
}): PastConversation {
  const { daysAgo = 0, _id = "conv_" + Math.random().toString(36).slice(2), ...rest } = overrides;
  return {
    _id,
    createdAt: NOW - daysAgo * 86400000,
    ...rest,
  };
}

describe("selectMemoryNudge", () => {
  it("returns null for empty input", () => {
    expect(selectMemoryNudge([], "electronics", undefined, NOW)).toBeNull();
  });

  it("returns null when no category match", () => {
    const result = selectMemoryNudge(
      [makeConversation({ item: "Headphones", category: "electronics", decision: "skipping" })],
      "furniture",
      undefined,
      NOW
    );
    expect(result).toBeNull();
  });

  it("returns null when current category is 'other'", () => {
    const result = selectMemoryNudge(
      [makeConversation({ item: "Gadget", category: "other", decision: "skipping" })],
      "other",
      undefined,
      NOW
    );
    expect(result).toBeNull();
  });

  it("picks category match over non-match", () => {
    const match = makeConversation({ _id: "match", item: "Laptop", category: "electronics", decision: "skipping" });
    const noMatch = makeConversation({ _id: "no-match", item: "Couch", category: "furniture", decision: "skipping" });
    const result = selectMemoryNudge([noMatch, match], "electronics", undefined, NOW);
    expect(result).not.toBeNull();
    expect(result!.conversationId).toBe("match");
    expect(result!.item).toBe("Laptop");
  });

  it("prefers low reference count over high", () => {
    const highRef = makeConversation({
      _id: "high",
      item: "Headphones",
      category: "electronics",
      decision: "skipping",
      memoryReferenceCount: 3,
      daysAgo: 1,
    });
    const lowRef = makeConversation({
      _id: "low",
      item: "Laptop",
      category: "electronics",
      decision: "skipping",
      memoryReferenceCount: 0,
      daysAgo: 5,
    });
    const result = selectMemoryNudge([highRef, lowRef], "electronics", undefined, NOW);
    expect(result!.conversationId).toBe("low");
  });

  it("breaks reference count tie by most recent", () => {
    const older = makeConversation({
      _id: "older",
      item: "Old headphones",
      category: "electronics",
      decision: "buying",
      memoryReferenceCount: 1,
      daysAgo: 10,
    });
    const newer = makeConversation({
      _id: "newer",
      item: "New headphones",
      category: "electronics",
      decision: "skipping",
      memoryReferenceCount: 1,
      daysAgo: 1,
    });
    const result = selectMemoryNudge([older, newer], "electronics", undefined, NOW);
    expect(result!.conversationId).toBe("newer");
  });

  it("skips items that are 'unknown' or missing", () => {
    const unknown = makeConversation({ _id: "bad1", item: "unknown", category: "electronics", decision: "skipping" });
    const missing = makeConversation({ _id: "bad2", category: "electronics", decision: "skipping" });
    const good = makeConversation({ _id: "good", item: "Laptop", category: "electronics", decision: "skipping" });
    const result = selectMemoryNudge([unknown, missing, good], "electronics", undefined, NOW);
    expect(result!.conversationId).toBe("good");
  });

  it("skips past conversations with category 'other'", () => {
    const other = makeConversation({ _id: "other", item: "Thing", category: "other", decision: "skipping" });
    const result = selectMemoryNudge([other], "electronics", undefined, NOW);
    expect(result).toBeNull();
  });

  it("accepts optional timezone parameter without breaking", () => {
    const conv = makeConversation({ item: "Laptop", category: "electronics", decision: "skipping", daysAgo: 2 });
    const result = selectMemoryNudge([conv], "electronics", "America/New_York", NOW);
    expect(result).not.toBeNull();
    expect(result!.item).toBe("Laptop");
    expect(result!.dateLabel).toBe("a few days ago");
  });

  it("treats undefined memoryReferenceCount as 0", () => {
    const noCount = makeConversation({
      _id: "no-count",
      item: "Phone",
      category: "electronics",
      decision: "skipping",
      daysAgo: 5,
    });
    const withCount = makeConversation({
      _id: "with-count",
      item: "Tablet",
      category: "electronics",
      decision: "skipping",
      memoryReferenceCount: 1,
      daysAgo: 1,
    });
    const result = selectMemoryNudge([withCount, noCount], "electronics", undefined, NOW);
    expect(result!.conversationId).toBe("no-count");
  });

  it("skips conversations without a decision", () => {
    const active = makeConversation({ _id: "active", item: "Phone", category: "electronics" });
    const result = selectMemoryNudge([active], "electronics", undefined, NOW);
    expect(result).toBeNull();
  });

  it("skips conversations with undefined decision", () => {
    const errorConv = makeConversation({
      _id: "err",
      item: "Phone",
      category: "electronics",
      decision: undefined,
    });
    const result = selectMemoryNudge([errorConv], "electronics", undefined, NOW);
    expect(result).toBeNull();
  });

  it("includes both skipping and buying conversations", () => {
    const skipping = makeConversation({
      _id: "skipping",
      item: "Phone",
      category: "electronics",
      decision: "skipping",
      memoryReferenceCount: 0,
      daysAgo: 2,
    });
    const buying = makeConversation({
      _id: "buying",
      item: "Laptop",
      category: "electronics",
      decision: "buying",
      memoryReferenceCount: 0,
      daysAgo: 1,
    });
    // Both are valid candidates — buying is more recent so it wins the tiebreak
    const result = selectMemoryNudge([skipping, buying], "electronics", undefined, NOW);
    expect(result).not.toBeNull();
    expect(result!.conversationId).toBe("buying");
    expect(result!.decision).toBe("buying");
  });

  it("returns decision and reactionText in the nudge", () => {
    const conv = makeConversation({
      _id: "c1",
      item: "Phone",
      category: "electronics",
      decision: "skipping",
      reactionText: "Pure impulse buy with no research",
    });
    const result = selectMemoryNudge([conv], "electronics", undefined, NOW);
    expect(result!.decision).toBe("skipping");
    expect(result!.reactionText).toBe("Pure impulse buy with no research");
  });
});

describe("selectMemoryNudge — old conversations", () => {
  it("still picks old conversations for nudge", () => {
    const convs = [
      makeConversation({ _id: "c1", item: "Laptop", category: "electronics", decision: "skipping", daysAgo: 100 }),
    ];
    const result = selectMemoryNudge(convs, "electronics", undefined, NOW);
    expect(result).not.toBeNull();
    expect(result!.item).toBe("Laptop");
  });
});

describe("formatNudgePrompt", () => {
  const baseNudge: MemoryNudge = {
    conversationId: "conv_123",
    item: "headphones",
    estimatedPrice: 550,
    decision: "skipping",
    dateLabel: "a few days ago",
  };

  it("outputs structured YAML-like data with all fields", () => {
    const result = formatNudgePrompt(baseNudge);
    expect(result).toContain("MEMORY:");
    expect(result).toContain('item: "headphones"');
    expect(result).toContain("price: $550");
    expect(result).toContain('date: "a few days ago"');
    expect(result).toContain("decision: skipping");
  });

  it("omits price line when 0", () => {
    const nudge = { ...baseNudge, estimatedPrice: 0 };
    const result = formatNudgePrompt(nudge);
    expect(result).not.toContain("price:");
  });

  it("omits price line when undefined", () => {
    const nudge = { ...baseNudge, estimatedPrice: undefined };
    const result = formatNudgePrompt(nudge);
    expect(result).not.toContain("price:");
  });

  it("sanitizes double quotes in item", () => {
    const nudge: MemoryNudge = {
      conversationId: "conv_456",
      item: 'He said "buy it"',
      estimatedPrice: 100,
      decision: "skipping",
      dateLabel: "a few days ago",
    };
    const result = formatNudgePrompt(nudge);
    expect(result).toContain("He said 'buy it'");
  });

  it("contains skipping guidance for skipping nudge", () => {
    const result = formatNudgePrompt(baseNudge);
    expect(result).toContain("walked away");
    expect(result).toContain("Reference this once");
    expect(result).not.toContain("made a real case");
  });

  it("contains buying guidance for buying nudge", () => {
    const nudge: MemoryNudge = { ...baseNudge, decision: "buying" };
    const result = formatNudgePrompt(nudge);
    expect(result).toContain("made a real case");
    expect(result).toContain("decision: buying");
    expect(result).not.toContain("walked away");
  });

  it("includes reactionText as reason line", () => {
    const nudge: MemoryNudge = {
      ...baseNudge,
      reactionText: "Pure impulse buy with no research",
    };
    const result = formatNudgePrompt(nudge);
    expect(result).toContain('reason: "Pure impulse buy with no research"');
  });

  it("omits reason line when reactionText is missing", () => {
    const nudge: MemoryNudge = { ...baseNudge, reactionText: undefined };
    const result = formatNudgePrompt(nudge);
    expect(result).not.toContain("reason:");
  });

  it("sanitizes double quotes in reactionText", () => {
    const nudge: MemoryNudge = {
      ...baseNudge,
      reactionText: 'User said "I need this" but had no justification',
    };
    const result = formatNudgePrompt(nudge);
    expect(result).toContain("reason: \"User said 'I need this' but had no justification\"");
  });
});

describe("selectMemoryNudges", () => {
  it("returns empty array for empty input", () => {
    expect(selectMemoryNudges([], "electronics", undefined, NOW)).toEqual([]);
  });

  it("returns empty array when current category is 'other'", () => {
    const convs = [makeConversation({ item: "Gadget", category: "other", decision: "skipping" })];
    expect(selectMemoryNudges(convs, "other", undefined, NOW)).toEqual([]);
  });

  it("returns up to 3 nudges", () => {
    const convs = [
      makeConversation({ _id: "c1", item: "Phone", category: "electronics", decision: "skipping", daysAgo: 1 }),
      makeConversation({ _id: "c2", item: "Laptop", category: "electronics", decision: "buying", daysAgo: 2 }),
      makeConversation({ _id: "c3", item: "Tablet", category: "electronics", decision: "skipping", daysAgo: 3 }),
      makeConversation({ _id: "c4", item: "Monitor", category: "electronics", decision: "buying", daysAgo: 4 }),
    ];
    const result = selectMemoryNudges(convs, "electronics", undefined, NOW);
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.conversationId)).toEqual(["c1", "c2", "c3"]);
  });

  it("respects sort order: lowest ref count first, then most recent", () => {
    const convs = [
      makeConversation({ _id: "high", item: "Headphones", category: "electronics", decision: "skipping", memoryReferenceCount: 3, daysAgo: 1 }),
      makeConversation({ _id: "low1", item: "Phone", category: "electronics", decision: "skipping", memoryReferenceCount: 0, daysAgo: 5 }),
      makeConversation({ _id: "low2", item: "Laptop", category: "electronics", decision: "buying", memoryReferenceCount: 0, daysAgo: 2 }),
    ];
    const result = selectMemoryNudges(convs, "electronics", undefined, NOW);
    expect(result[0].conversationId).toBe("low2"); // lowest ref, most recent
    expect(result[1].conversationId).toBe("low1"); // lowest ref, older
    expect(result[2].conversationId).toBe("high"); // higher ref count
  });

  it("returns fewer than 3 when fewer candidates exist", () => {
    const convs = [
      makeConversation({ _id: "c1", item: "Phone", category: "electronics", decision: "skipping" }),
    ];
    const result = selectMemoryNudges(convs, "electronics", undefined, NOW);
    expect(result).toHaveLength(1);
    expect(result[0].conversationId).toBe("c1");
  });
});

describe("formatNudgePrompt — array + territory", () => {
  const nudge1: MemoryNudge = {
    conversationId: "conv_1",
    item: "headphones",
    estimatedPrice: 550,
    decision: "skipping",
    dateLabel: "a few days ago",
  };
  const nudge2: MemoryNudge = {
    conversationId: "conv_2",
    item: "speakers",
    estimatedPrice: 300,
    decision: "buying",
    dateLabel: "last week",
  };

  it("uses MEMORY label for single nudge (backward compat)", () => {
    const result = formatNudgePrompt(nudge1);
    expect(result).toContain("MEMORY:");
    expect(result).not.toContain("MEMORY_1:");
  });

  it("uses numbered labels for multiple nudges", () => {
    const result = formatNudgePrompt([nudge1, nudge2]);
    expect(result).toContain("MEMORY_1:");
    expect(result).toContain("MEMORY_2:");
    expect(result).not.toContain("MEMORY:");
  });

  it("includes both skipping and buying guidance for mixed nudges", () => {
    const result = formatNudgePrompt([nudge1, nudge2]);
    expect(result).toContain("walked away");
    expect(result).toContain("made a real case");
  });

  it("adds territory-specific guidance for 'pattern'", () => {
    const result = formatNudgePrompt([nudge1], "pattern");
    expect(result).toContain("They have a pattern here");
  });

  it("adds territory-specific guidance for 'real_cost'", () => {
    const result = formatNudgePrompt([nudge1], "real_cost");
    expect(result).toContain("They've spent on this category before");
  });

  it("adds territory-specific guidance for 'alternatives'", () => {
    const result = formatNudgePrompt([nudge1], "alternatives");
    expect(result).toContain("They considered alternatives before");
  });

  it("adds territory-specific guidance for 'trigger'", () => {
    const result = formatNudgePrompt([nudge1], "trigger");
    expect(result).toContain("Similar purchase was emotional last time");
  });

  it("adds territory-specific guidance for 'emotional_check'", () => {
    const result = formatNudgePrompt([nudge1], "emotional_check");
    expect(result).toContain("Similar purchase was emotional last time");
  });

  it("uses generic guidance when territory is null", () => {
    const result = formatNudgePrompt([nudge1], null);
    expect(result).not.toContain("They have a pattern");
    expect(result).not.toContain("They've spent on this");
    expect(result).toContain("walked away"); // still has decision guidance
  });

  it("uses generic guidance for unmapped territory", () => {
    const result = formatNudgePrompt([nudge1], "current_solution");
    expect(result).not.toContain("They have a pattern");
    expect(result).toContain("walked away");
  });

  it("returns empty string for empty array", () => {
    const result = formatNudgePrompt([], null);
    expect(result).toBe("");
  });
});

describe("buildCompassBlock — contradiction narration", () => {
  const coverageMap = initCoverageMap("want");

  const softContradiction: StoredContradiction = {
    territory: "real_cost",
    turnDetected: 3,
    priorClaim: "I never spend on electronics",
    currentClaim: "I bought a laptop last month",
    severity: "soft",
    resolved: false,
  };

  const hardContradiction: StoredContradiction = {
    territory: "trigger",
    turnDetected: 4,
    priorClaim: "My old one works fine",
    currentClaim: "My old one is broken",
    severity: "hard",
    resolved: false,
  };

  const resolvedContradiction: StoredContradiction = {
    territory: "usage_reality",
    turnDetected: 2,
    priorClaim: "I'd use it daily",
    currentClaim: "Maybe weekly",
    severity: "soft",
    resolved: true,
    turnResolved: 3,
  };

  it("omits section when no contradictions", () => {
    const result = buildCompassBlock("PROBING", "real_cost", coverageMap, 0);
    expect(result).not.toContain("CONTRADICTIONS:");
  });

  it("omits section when contradictions array is empty", () => {
    const result = buildCompassBlock("PROBING", "real_cost", coverageMap, 0, undefined, []);
    expect(result).not.toContain("CONTRADICTIONS:");
  });

  it("omits section when all contradictions are resolved", () => {
    const result = buildCompassBlock("PROBING", "real_cost", coverageMap, 0, undefined, [resolvedContradiction]);
    expect(result).not.toContain("CONTRADICTIONS:");
  });

  it("narrates unresolved contradictions", () => {
    const result = buildCompassBlock("PROBING", "pattern", coverageMap, 0, undefined, [softContradiction]);
    expect(result).toContain("CONTRADICTIONS:");
    expect(result).toContain('[real_cost]: They said "I never spend on electronics" but now say "I bought a laptop last month" (soft)');
  });

  it("narrates multiple unresolved contradictions", () => {
    const result = buildCompassBlock("PROBING", "pattern", coverageMap, 0, undefined, [softContradiction, hardContradiction]);
    expect(result).toContain("[real_cost]:");
    expect(result).toContain("[trigger]:");
    expect(result).toContain("(hard)");
  });

  it("filters out resolved, shows only unresolved", () => {
    const result = buildCompassBlock("PROBING", "pattern", coverageMap, 0, undefined, [softContradiction, resolvedContradiction]);
    expect(result).toContain("[real_cost]:");
    expect(result).not.toContain("[usage_reality]:");
  });

  it("adds emphasis when assigned territory has a contradiction", () => {
    const result = buildCompassBlock("PROBING", "real_cost", coverageMap, 0, undefined, [softContradiction]);
    expect(result).toContain("This territory has an unresolved contradiction. Press on it.");
  });

  it("omits emphasis when assigned territory has no contradiction", () => {
    const result = buildCompassBlock("PROBING", "pattern", coverageMap, 0, undefined, [softContradiction]);
    expect(result).not.toContain("Press on it.");
  });

  it("places contradictions after examination progress and before stagnation", () => {
    const result = buildCompassBlock("PROBING", "real_cost", coverageMap, 3, undefined, [softContradiction]);
    const contradictionIdx = result.indexOf("CONTRADICTIONS:");
    const stagnationIdx = result.indexOf("NOTE: Nothing new");
    const progressIdx = result.indexOf("EXAMINATION PROGRESS:");
    expect(progressIdx).toBeLessThan(contradictionIdx);
    expect(contradictionIdx).toBeLessThan(stagnationIdx);
  });
});
