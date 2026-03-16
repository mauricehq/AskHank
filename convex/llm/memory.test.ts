import { describe, it, expect } from "vitest";
import { selectMemoryNudge, formatNudgePrompt, type PastConversation, type MemoryNudge } from "./memory";

// Fixed reference time so all tests are deterministic (no Date.now() drift)
const NOW = Date.UTC(2026, 2, 13, 12, 0); // March 13, 2026 12:00 UTC

function makeConversation(overrides: {
  _id?: string;
  item?: string;
  category?: string;
  estimatedPrice?: number;
  verdict?: "approved" | "denied";
  verdictSummary?: string;
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
      [makeConversation({ item: "Headphones", category: "electronics", verdict: "denied" })],
      "furniture",
      undefined,
      NOW
    );
    expect(result).toBeNull();
  });

  it("returns null when current category is 'other'", () => {
    const result = selectMemoryNudge(
      [makeConversation({ item: "Gadget", category: "other", verdict: "denied" })],
      "other",
      undefined,
      NOW
    );
    expect(result).toBeNull();
  });

  it("picks category match over non-match", () => {
    const match = makeConversation({ _id: "match", item: "Laptop", category: "electronics", verdict: "denied" });
    const noMatch = makeConversation({ _id: "no-match", item: "Couch", category: "furniture", verdict: "denied" });
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
      verdict: "denied",
      memoryReferenceCount: 3,
      daysAgo: 1,
    });
    const lowRef = makeConversation({
      _id: "low",
      item: "Laptop",
      category: "electronics",
      verdict: "denied",
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
      verdict: "approved",
      memoryReferenceCount: 1,
      daysAgo: 10,
    });
    const newer = makeConversation({
      _id: "newer",
      item: "New headphones",
      category: "electronics",
      verdict: "denied",
      memoryReferenceCount: 1,
      daysAgo: 1,
    });
    const result = selectMemoryNudge([older, newer], "electronics", undefined, NOW);
    expect(result!.conversationId).toBe("newer");
  });

  it("skips items that are 'unknown' or missing", () => {
    const unknown = makeConversation({ _id: "bad1", item: "unknown", category: "electronics", verdict: "denied" });
    const missing = makeConversation({ _id: "bad2", category: "electronics", verdict: "denied" });
    const good = makeConversation({ _id: "good", item: "Laptop", category: "electronics", verdict: "denied" });
    const result = selectMemoryNudge([unknown, missing, good], "electronics", undefined, NOW);
    expect(result!.conversationId).toBe("good");
  });

  it("skips past conversations with category 'other'", () => {
    const other = makeConversation({ _id: "other", item: "Thing", category: "other", verdict: "denied" });
    const result = selectMemoryNudge([other], "electronics", undefined, NOW);
    expect(result).toBeNull();
  });

  it("accepts optional timezone parameter without breaking", () => {
    const conv = makeConversation({ item: "Laptop", category: "electronics", verdict: "denied", daysAgo: 2 });
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
      verdict: "denied",
      daysAgo: 5,
    });
    const withCount = makeConversation({
      _id: "with-count",
      item: "Tablet",
      category: "electronics",
      verdict: "denied",
      memoryReferenceCount: 1,
      daysAgo: 1,
    });
    const result = selectMemoryNudge([withCount, noCount], "electronics", undefined, NOW);
    expect(result!.conversationId).toBe("no-count");
  });

  it("skips conversations without a verdict", () => {
    const active = makeConversation({ _id: "active", item: "Phone", category: "electronics" });
    const result = selectMemoryNudge([active], "electronics", undefined, NOW);
    expect(result).toBeNull();
  });

  it("skips conversations with undefined verdict", () => {
    const errorConv = makeConversation({
      _id: "err",
      item: "Phone",
      category: "electronics",
      verdict: undefined,
    });
    const result = selectMemoryNudge([errorConv], "electronics", undefined, NOW);
    expect(result).toBeNull();
  });

  it("includes both denied and approved conversations", () => {
    const denied = makeConversation({
      _id: "denied",
      item: "Phone",
      category: "electronics",
      verdict: "denied",
      memoryReferenceCount: 0,
      daysAgo: 2,
    });
    const approved = makeConversation({
      _id: "approved",
      item: "Laptop",
      category: "electronics",
      verdict: "approved",
      memoryReferenceCount: 0,
      daysAgo: 1,
    });
    // Both are valid candidates — approved is more recent so it wins the tiebreak
    const result = selectMemoryNudge([denied, approved], "electronics", undefined, NOW);
    expect(result).not.toBeNull();
    expect(result!.conversationId).toBe("approved");
    expect(result!.verdict).toBe("approved");
  });

  it("returns verdict and verdictSummary in the nudge", () => {
    const conv = makeConversation({
      _id: "c1",
      item: "Phone",
      category: "electronics",
      verdict: "denied",
      verdictSummary: "Pure impulse buy with no research",
    });
    const result = selectMemoryNudge([conv], "electronics", undefined, NOW);
    expect(result!.verdict).toBe("denied");
    expect(result!.verdictSummary).toBe("Pure impulse buy with no research");
  });
});

describe("selectMemoryNudge — old conversations", () => {
  it("still picks old conversations for nudge", () => {
    const convs = [
      makeConversation({ _id: "c1", item: "Laptop", category: "electronics", verdict: "denied", daysAgo: 100 }),
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
    verdict: "denied",
    dateLabel: "a few days ago",
  };

  it("outputs structured YAML-like data with all fields", () => {
    const result = formatNudgePrompt(baseNudge);
    expect(result).toContain("MEMORY:");
    expect(result).toContain('item: "headphones"');
    expect(result).toContain("price: $550");
    expect(result).toContain('date: "a few days ago"');
    expect(result).toContain("verdict: denied");
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
      verdict: "denied",
      dateLabel: "a few days ago",
    };
    const result = formatNudgePrompt(nudge);
    expect(result).toContain("He said 'buy it'");
  });

  it("contains denied guidance for denied nudge", () => {
    const result = formatNudgePrompt(baseNudge);
    expect(result).toContain("shut this down");
    expect(result).toContain("Reference this once");
    expect(result).not.toContain("made a real case");
  });

  it("contains approved guidance for approved nudge", () => {
    const nudge: MemoryNudge = { ...baseNudge, verdict: "approved" };
    const result = formatNudgePrompt(nudge);
    expect(result).toContain("made a real case");
    expect(result).toContain("verdict: approved");
    expect(result).not.toContain("shut this down");
  });

  it("includes verdictSummary as reason line", () => {
    const nudge: MemoryNudge = {
      ...baseNudge,
      verdictSummary: "Pure impulse buy with no research",
    };
    const result = formatNudgePrompt(nudge);
    expect(result).toContain('reason: "Pure impulse buy with no research"');
  });

  it("omits reason line when verdictSummary is missing", () => {
    const nudge: MemoryNudge = { ...baseNudge, verdictSummary: undefined };
    const result = formatNudgePrompt(nudge);
    expect(result).not.toContain("reason:");
  });

  it("sanitizes double quotes in verdictSummary", () => {
    const nudge: MemoryNudge = {
      ...baseNudge,
      verdictSummary: 'User said "I need this" but had no justification',
    };
    const result = formatNudgePrompt(nudge);
    expect(result).toContain("reason: \"User said 'I need this' but had no justification\"");
  });
});
