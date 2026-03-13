import { describe, it, expect } from "vitest";
import { selectMemoryNudge, formatNudgePrompt, type PastConversation, type MemoryNudge } from "./memory";

function makeConversation(overrides: {
  _id?: string;
  item?: string;
  category?: string;
  estimatedPrice?: number;
  excuse?: string;
  memoryReferenceCount?: number;
  daysAgo?: number;
}): PastConversation {
  const { daysAgo = 0, _id = "conv_" + Math.random().toString(36).slice(2), ...rest } = overrides;
  return {
    _id,
    createdAt: Date.now() - daysAgo * 86400000,
    ...rest,
  };
}

describe("selectMemoryNudge", () => {
  it("returns null for empty input", () => {
    expect(selectMemoryNudge([], "electronics")).toBeNull();
  });

  it("returns null when no category match", () => {
    const result = selectMemoryNudge(
      [makeConversation({ item: "Headphones", category: "electronics" })],
      "furniture"
    );
    expect(result).toBeNull();
  });

  it("returns null when current category is 'other'", () => {
    const result = selectMemoryNudge(
      [makeConversation({ item: "Gadget", category: "other" })],
      "other"
    );
    expect(result).toBeNull();
  });

  it("picks category match over non-match", () => {
    const match = makeConversation({ _id: "match", item: "Laptop", category: "electronics" });
    const noMatch = makeConversation({ _id: "no-match", item: "Couch", category: "furniture" });
    const result = selectMemoryNudge([noMatch, match], "electronics");
    expect(result).not.toBeNull();
    expect(result!.conversationId).toBe("match");
    expect(result!.item).toBe("Laptop");
  });

  it("prefers low reference count over high", () => {
    const highRef = makeConversation({
      _id: "high",
      item: "Headphones",
      category: "electronics",
      memoryReferenceCount: 3,
      daysAgo: 1,
    });
    const lowRef = makeConversation({
      _id: "low",
      item: "Laptop",
      category: "electronics",
      memoryReferenceCount: 0,
      daysAgo: 5,
    });
    const result = selectMemoryNudge([highRef, lowRef], "electronics");
    expect(result!.conversationId).toBe("low");
  });

  it("breaks reference count tie by most recent", () => {
    const older = makeConversation({
      _id: "older",
      item: "Old headphones",
      category: "electronics",
      memoryReferenceCount: 1,
      daysAgo: 10,
    });
    const newer = makeConversation({
      _id: "newer",
      item: "New headphones",
      category: "electronics",
      memoryReferenceCount: 1,
      daysAgo: 1,
    });
    const result = selectMemoryNudge([older, newer], "electronics");
    expect(result!.conversationId).toBe("newer");
  });

  it("skips items that are 'unknown' or missing", () => {
    const unknown = makeConversation({ _id: "bad1", item: "unknown", category: "electronics" });
    const missing = makeConversation({ _id: "bad2", category: "electronics" });
    const good = makeConversation({ _id: "good", item: "Laptop", category: "electronics" });
    const result = selectMemoryNudge([unknown, missing, good], "electronics");
    expect(result!.conversationId).toBe("good");
  });

  it("skips past conversations with category 'other'", () => {
    const other = makeConversation({ _id: "other", item: "Thing", category: "other" });
    const result = selectMemoryNudge([other], "electronics");
    expect(result).toBeNull();
  });

  it("treats undefined memoryReferenceCount as 0", () => {
    const noCount = makeConversation({
      _id: "no-count",
      item: "Phone",
      category: "electronics",
      daysAgo: 5,
    });
    const withCount = makeConversation({
      _id: "with-count",
      item: "Tablet",
      category: "electronics",
      memoryReferenceCount: 1,
      daysAgo: 1,
    });
    const result = selectMemoryNudge([withCount, noCount], "electronics");
    expect(result!.conversationId).toBe("no-count");
  });
});

describe("formatNudgePrompt", () => {
  const baseNudge: MemoryNudge = {
    conversationId: "conv_123",
    item: "headphones",
    estimatedPrice: 550,
    excuse: "I listen to music all day",
    dateLabel: "Mar 5",
  };

  it("outputs structured YAML-like data with all fields", () => {
    const result = formatNudgePrompt(baseNudge);
    expect(result).toContain("MEMORY:");
    expect(result).toContain('previous_item: "headphones"');
    expect(result).toContain("price: $550");
    expect(result).toContain('date: "Mar 5"');
    expect(result).not.toContain("user:");
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

  it("includes their_claim when excuse present", () => {
    const result = formatNudgePrompt(baseNudge);
    expect(result).toContain('their_claim: "I listen to music all day"');
  });

  it("omits their_claim when excuse is undefined", () => {
    const nudge = { ...baseNudge, excuse: undefined };
    const result = formatNudgePrompt(nudge);
    expect(result).not.toContain("their_claim");
  });

  it("sanitizes double quotes in item and excuse", () => {
    const nudge: MemoryNudge = {
      conversationId: "conv_456",
      item: 'He said "buy it"',
      estimatedPrice: 100,
      excuse: 'She said "you need this"',
      dateLabel: "Mar 8",
    };
    const result = formatNudgePrompt(nudge);
    expect(result).toContain("He said 'buy it'");
    expect(result).toContain("She said 'you need this'");
  });

  it("includes the directive and examples", () => {
    const result = formatNudgePrompt(baseNudge);
    expect(result).toContain("Weave one dry callback");
    expect(result).toContain("Don't parrot");
    expect(result).toContain("Examples:");
  });
});
