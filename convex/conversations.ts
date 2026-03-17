import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireUser } from "./lib/auth";
import { DEFAULTS } from "./appSettings";
import { MESSAGE_COST } from "./lib/credits";

// --- Public API ---

export const send = mutation({
  args: {
    conversationId: v.optional(v.id("conversations")),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    // Credit check
    const creditsRow = await ctx.db
      .query("credits")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (!creditsRow || creditsRow.balance < MESSAGE_COST) {
      throw new Error("INSUFFICIENT_CREDITS");
    }

    const content = args.content.trim();
    if (content.length === 0 || content.length > 2000) {
      throw new Error("Message must be 1-2000 characters.");
    }

    let conversationId = args.conversationId;

    if (!conversationId) {
      // Create new conversation
      conversationId = await ctx.db.insert("conversations", {
        userId: user._id,
        status: "thinking",
        createdAt: Date.now(),
        disengagementCount: 0,
        stagnationCount: 0,
        thinkingSince: Date.now(),
      });
    } else {
      // Verify ownership and state
      const conversation = await ctx.db.get(conversationId);
      if (!conversation || conversation.userId !== user._id) {
        throw new Error("Conversation not found.");
      }
      if (conversation.status === "closed") {
        throw new Error("This conversation is closed.");
      }
      if (conversation.status === "thinking") {
        throw new Error("Hank is still thinking.");
      }
      await ctx.db.patch(conversationId, { status: "thinking", thinkingSince: Date.now() });
    }

    // Deduct credit (OCC handles race conditions)
    await ctx.db.patch(creditsRow._id, {
      balance: creditsRow.balance - MESSAGE_COST,
      totalUsed: creditsRow.totalUsed + MESSAGE_COST,
    });

    // Insert user message
    await ctx.db.insert("messages", {
      conversationId,
      role: "user",
      content,
      createdAt: Date.now(),
    });

    // Schedule LLM response
    await ctx.scheduler.runAfter(0, internal.llm.generate.respond, {
      conversationId,
      userId: user._id,
    });

    // Safety net: recover if still thinking after 60s
    await ctx.scheduler.runAfter(60_000, internal.conversations.recoverStuckConversation, {
      conversationId,
    });

    return conversationId;
  },
});

export const listForUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const results = await Promise.all(
      conversations.map(async (conv) => {
        const firstMessage = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
          .first();

        const fallbackTitle = firstMessage?.content
          ? firstMessage.content.length > 40
            ? firstMessage.content.slice(0, 40) + "…"
            : firstMessage.content
          : "New conversation";

        return {
          _id: conv._id,
          title: conv.item ?? fallbackTitle,
          verdict: conv.verdict,
          status: conv.status,
          createdAt: conv.createdAt,
          estimatedPrice: conv.estimatedPrice,
        };
      })
    );

    results.sort((a, b) => b.createdAt - a.createdAt);
    return results;
  },
});

export const deleteConversation = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== user._id) {
      throw new Error("Conversation not found.");
    }

    // Delete all messages
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();
    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }

    // Delete all LLM traces
    const traces = await ctx.db
      .query("llmTraces")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();
    for (const trace of traces) {
      await ctx.db.delete(trace._id);
    }

    // Delete the conversation itself
    await ctx.db.delete(args.conversationId);
  },
});

export const getConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== user._id) {
      return null;
    }
    return conversation;
  },
});

export const getMessages = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== user._id) {
      return [];
    }
    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();
  },
});

// --- Internal API (called by actions) ---

export const internalGetMessages = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();
  },
});

export const internalGetSetting = internalQuery({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    return row?.value ?? DEFAULTS[args.key] ?? null;
  },
});

export const internalGetUserInfo = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    return {
      displayName: user?.displayName ?? null,
      timezone: user?.timezone ?? null,
      incomeAmount: user?.incomeAmount ?? null,
      incomeType: user?.incomeType ?? null,
    };
  },
});

export const saveResponse = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      role: "hank",
      content: args.content,
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.conversationId, { status: "active", thinkingSince: undefined });
    return messageId;
  },
});

export const setError = internalMutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, { status: "error", thinkingSince: undefined });
  },
});

export const recoverStuckConversation = internalMutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return;

    // Only recover if still thinking and thinkingSince is older than 60s
    if (
      conversation.status === "thinking" &&
      conversation.thinkingSince &&
      Date.now() - conversation.thinkingSince >= 60_000
    ) {
      await ctx.db.patch(args.conversationId, {
        status: "error",
        thinkingSince: undefined,
      });
      console.warn(`Recovered stuck conversation ${args.conversationId} after 60s`);
    }
  },
});

export const internalGetConversation = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.conversationId);
  },
});

export const saveResponseWithScoring = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    score: v.number(),
    stance: v.string(),
    category: v.optional(v.string()),
    estimatedPrice: v.optional(v.number()),
    item: v.optional(v.string()),
    lastAssessment: v.optional(v.string()),
    disengagementCount: v.number(),
    stagnationCount: v.number(),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      role: "hank",
      content: args.content,
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.conversationId, {
      status: "active",
      score: args.score,
      stance: args.stance,
      category: args.category,
      estimatedPrice: args.estimatedPrice,
      item: args.item,
      lastAssessment: args.lastAssessment,
      disengagementCount: args.disengagementCount,
      stagnationCount: args.stagnationCount,
      thinkingSince: undefined,
    });
    return messageId;
  },
});

export const internalGetPastConversations = internalQuery({
  args: {
    userId: v.id("users"),
    excludeConversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return conversations
      .filter((c) => c._id !== args.excludeConversationId)
      .map((c) => ({
        _id: c._id,
        item: c.item,
        category: c.category,
        estimatedPrice: c.estimatedPrice,
        verdict: c.verdict,
        verdictSummary: c.verdictSummary,
        createdAt: c.createdAt,
        memoryReferenceCount: c.memoryReferenceCount,
      }));
  },
});

export const internalIncrementMemoryRef = internalMutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return;
    await ctx.db.patch(args.conversationId, {
      memoryReferenceCount: (conversation.memoryReferenceCount ?? 0) + 1,
    });
  },
});

// --- Test helpers (internal only, used by testChat) ---

export const internalGetFirstAdmin = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "admin"))
      .first();
  },
});

export const createTestConversation = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.insert("conversations", {
      userId: args.userId,
      status: "thinking",
      createdAt: Date.now(),
      disengagementCount: 0,
      stagnationCount: 0,
      thinkingSince: Date.now(),
    });
  },
});

export const insertTestMessage = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");
    if (conversation.status === "closed") throw new Error("Conversation is closed");

    await ctx.db.patch(args.conversationId, { status: "thinking", thinkingSince: Date.now() });
    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      role: "user",
      content: args.content,
      createdAt: Date.now(),
    });
  },
});

export const patchVerdictSummary = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    verdictSummary: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, {
      verdictSummary: args.verdictSummary,
    });

    // Also patch the verdict ledger entry
    const ledgerEntry = await ctx.db
      .query("verdictLedger")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .unique();
    if (ledgerEntry) {
      await ctx.db.patch(ledgerEntry._id, {
        verdictSummary: args.verdictSummary,
      });
    }
  },
});

export const saveResponseWithVerdict = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    verdict: v.union(v.literal("approved"), v.literal("denied")),
    score: v.number(),
    stance: v.string(),
    category: v.optional(v.string()),
    estimatedPrice: v.optional(v.number()),
    item: v.optional(v.string()),
    lastAssessment: v.optional(v.string()),
    disengagementCount: v.number(),
    stagnationCount: v.number(),
    verdictSummary: v.optional(v.string()),
    shareScore: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      role: "hank",
      content: args.content,
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.conversationId, {
      status: "closed",
      verdict: args.verdict,
      score: args.score,
      stance: args.stance,
      category: args.category,
      estimatedPrice: args.estimatedPrice,
      item: args.item,
      lastAssessment: args.lastAssessment,
      disengagementCount: args.disengagementCount,
      stagnationCount: args.stagnationCount,
      verdictSummary: args.verdictSummary,
      shareScore: args.shareScore,
      thinkingSince: undefined,
    });

    // Fetch conversation for userId (needed for ledger + user stats)
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return messageId;

    // Insert verdict into ledger
    if (args.item) {
      await ctx.db.insert("verdictLedger", {
        userId: conversation.userId,
        conversationId: args.conversationId,
        item: args.item,
        category: args.category,
        estimatedPrice: args.estimatedPrice,
        verdict: args.verdict,
        createdAt: conversation.createdAt,
      });
    }

    // Increment user's savedTotal and deniedCount on denied verdicts
    if (args.verdict === "denied") {
      const user = await ctx.db.get(conversation.userId);
      if (user) {
        await ctx.db.patch(user._id, {
          deniedCount: (user.deniedCount ?? 0) + 1,
          ...(args.estimatedPrice && args.estimatedPrice > 0
            ? { savedTotal: (user.savedTotal ?? 0) + args.estimatedPrice }
            : {}),
        });
      }
    }

    return messageId;
  },
});
