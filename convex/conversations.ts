import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireUser } from "./lib/auth";
import { DEFAULTS } from "./appSettings";
import { MESSAGE_COST } from "./lib/credits";

// --- Follow-up system ---

export const getPendingFollowUps = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const sevenDaysAgo = Date.now() - 7 * 86400000;

    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return conversations
      .filter(
        (c) =>
          c.status === "resolved" &&
          (c.decision === "buying" || c.decision === "skipping") &&
          c.outcome === undefined &&
          c.createdAt > sevenDaysAgo
      )
      .map((c) => ({
        _id: c._id,
        item: c.item,
        decision: c.decision,
        hankScore: c.hankScore,
        estimatedPrice: c.estimatedPrice,
        category: c.category,
        createdAt: c.createdAt,
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const recordOutcome = mutation({
  args: {
    conversationId: v.id("conversations"),
    outcome: v.union(v.literal("purchased"), v.literal("skipped")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const conversation = await ctx.db.get(args.conversationId);

    if (!conversation || conversation.userId !== user._id) {
      throw new Error("Conversation not found.");
    }
    if (conversation.status !== "resolved") {
      throw new Error("Conversation is not resolved.");
    }
    if (conversation.outcome !== undefined) {
      throw new Error("Outcome already recorded.");
    }

    await ctx.db.patch(args.conversationId, {
      outcome: args.outcome,
      outcomeRecordedAt: Date.now(),
    });

    // Adjust savedTotal based on outcome vs original decision
    if (args.outcome === "skipped" && conversation.decision === "buying") {
      // User said buying but didn't — surprise save
      const price = conversation.estimatedPrice ?? 0;
      if (price > 0) {
        await ctx.db.patch(user._id, {
          savedTotal: (user.savedTotal ?? 0) + price,
          skippedCount: (user.skippedCount ?? 0) + 1,
        });
      }
    } else if (args.outcome === "purchased" && conversation.decision === "skipping") {
      // User said skipping but bought — reverse the save
      const price = conversation.estimatedPrice ?? 0;
      if (price > 0) {
        await ctx.db.patch(user._id, {
          savedTotal: Math.max(0, (user.savedTotal ?? 0) - price),
          skippedCount: Math.max(0, (user.skippedCount ?? 0) - 1),
        });
      }
    }

    return args.outcome;
  },
});

export const expireStaleFollowUps = internalMutation({
  args: {},
  handler: async (ctx) => {
    const sevenDaysAgo = Date.now() - 7 * 86400000;

    // Full table scan — no compound index available. Acceptable for a daily cron.
    const conversations = await ctx.db
      .query("conversations")
      .collect();

    const stale = conversations.filter(
      (c) =>
        c.status === "resolved" &&
        (c.decision === "buying" || c.decision === "skipping") &&
        c.outcome === undefined &&
        c.createdAt < sevenDaysAgo
    );

    for (const conv of stale) {
      await ctx.db.patch(conv._id, {
        outcome: "unknown",
        outcomeRecordedAt: Date.now(),
      });
    }

    if (stale.length > 0) {
      console.log(`Expired ${stale.length} stale follow-ups`);
    }
  },
});

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
        consecutiveNonAnswers: 0,
        thinkingSince: Date.now(),
      });
    } else {
      // Verify ownership and state
      const conversation = await ctx.db.get(conversationId);
      if (!conversation || conversation.userId !== user._id) {
        throw new Error("Conversation not found.");
      }
      if (conversation.status === "resolved") {
        throw new Error("This conversation is resolved.");
      }
      if (conversation.status === "thinking") {
        throw new Error("Hank is still thinking.");
      }
      // Resume conversation (paused, active, or error) — set to thinking for LLM generation
      if (conversation.status === "error") {
        console.warn(`Retrying conversation ${conversationId} from error state`);
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
          decision: conv.decision,
          status: conv.status,
          createdAt: conv.createdAt,
          estimatedPrice: conv.estimatedPrice,
          hankScore: conv.hankScore,
          outcome: conv.outcome,
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

    // Delete decision ledger entries
    const ledgerEntries = await ctx.db
      .query("decisionLedger")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();
    for (const entry of ledgerEntries) {
      await ctx.db.delete(entry._id);
    }

    // Delete share cards
    const shareCards = await ctx.db
      .query("shareCards")
      .withIndex("by_conversation_and_type", (q) => q.eq("conversationId", args.conversationId))
      .collect();
    for (const card of shareCards) {
      await ctx.db.delete(card._id);
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
    lastAssessment: v.optional(v.string()),
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
      thinkingSince: undefined,
      ...(args.lastAssessment ? { lastAssessment: args.lastAssessment } : {}),
    });
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

export const saveResponseWithCompass = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    intensity: v.string(),
    coverageRatio: v.number(),
    category: v.optional(v.string()),
    estimatedPrice: v.optional(v.number()),
    item: v.optional(v.string()),
    lastAssessment: v.optional(v.string()),
    consecutiveNonAnswers: v.number(),
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
      intensity: args.intensity,
      coverageRatio: args.coverageRatio,
      category: args.category,
      estimatedPrice: args.estimatedPrice,
      item: args.item,
      lastAssessment: args.lastAssessment,
      consecutiveNonAnswers: args.consecutiveNonAnswers,
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
        decision: c.decision,
        reactionText: c.reactionText,
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

export const saveResponseWithDecision = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    decision: v.union(v.literal("buying"), v.literal("skipping")),
    intensity: v.string(),
    coverageRatio: v.number(),
    category: v.optional(v.string()),
    estimatedPrice: v.optional(v.number()),
    item: v.optional(v.string()),
    lastAssessment: v.optional(v.string()),
    consecutiveNonAnswers: v.number(),
    reactionText: v.optional(v.string()),
    hankScore: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      role: "hank",
      content: args.content,
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.conversationId, {
      status: "resolved",
      decision: args.decision,
      intensity: args.intensity,
      coverageRatio: args.coverageRatio,
      category: args.category,
      estimatedPrice: args.estimatedPrice,
      item: args.item,
      lastAssessment: args.lastAssessment,
      consecutiveNonAnswers: args.consecutiveNonAnswers,
      reactionText: args.reactionText,
      hankScore: args.hankScore,
      thinkingSince: undefined,
    });

    // Fetch conversation for userId (needed for ledger + user stats)
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return messageId;

    // Insert decision into ledger
    if (args.item) {
      await ctx.db.insert("decisionLedger", {
        userId: conversation.userId,
        conversationId: args.conversationId,
        item: args.item,
        category: args.category,
        estimatedPrice: args.estimatedPrice,
        decision: args.decision,
        reactionText: args.reactionText,
        hankScore: args.hankScore,
        createdAt: Date.now(),
      });
    }

    // Increment user's savedTotal and skippedCount on skipping decisions
    if (args.decision === "skipping") {
      const user = await ctx.db.get(conversation.userId);
      if (user) {
        await ctx.db.patch(user._id, {
          skippedCount: (user.skippedCount ?? 0) + 1,
          ...(args.estimatedPrice && args.estimatedPrice > 0
            ? { savedTotal: (user.savedTotal ?? 0) + args.estimatedPrice }
            : {}),
        });
      }
    }

    return messageId;
  },
});

export const patchReactionText = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    reactionText: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, {
      reactionText: args.reactionText,
    });

    // Also patch the decision ledger entry
    const ledgerEntry = await ctx.db
      .query("decisionLedger")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .unique();
    if (ledgerEntry) {
      await ctx.db.patch(ledgerEntry._id, {
        reactionText: args.reactionText,
      });
    }
  },
});

export const resolve = mutation({
  args: {
    conversationId: v.id("conversations"),
    decision: v.union(v.literal("buying"), v.literal("skipping"), v.literal("thinking")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== user._id) {
      throw new Error("Conversation not found.");
    }
    if (conversation.status !== "active" && conversation.status !== "paused") {
      throw new Error("Conversation cannot be resolved from current state.");
    }

    if (args.decision === "thinking") {
      // Pause the conversation
      await ctx.db.patch(args.conversationId, { status: "paused" });
      return;
    }

    // buying or skipping — set to thinking while we generate the reaction
    await ctx.db.patch(args.conversationId, {
      status: "thinking",
      thinkingSince: Date.now(),
    });

    // Schedule reaction generation
    await ctx.scheduler.runAfter(0, internal.llm.generate.generateReaction, {
      conversationId: args.conversationId,
      userId: user._id,
      decision: args.decision,
    });

    // Safety net: recover if still thinking after 60s
    await ctx.scheduler.runAfter(60_000, internal.conversations.recoverStuckConversation, {
      conversationId: args.conversationId,
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
      consecutiveNonAnswers: 0,
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
    if (conversation.status === "resolved") throw new Error("Conversation is resolved");
    if (conversation.status === "thinking") throw new Error("Hank is still thinking");

    await ctx.db.patch(args.conversationId, { status: "thinking", thinkingSince: Date.now() });
    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      role: "user",
      content: args.content,
      createdAt: Date.now(),
    });
  },
});
