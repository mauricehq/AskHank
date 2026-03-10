import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireUser } from "./lib/auth";
import { DEFAULTS } from "./appSettings";

// --- Public API ---

export const send = mutation({
  args: {
    conversationId: v.optional(v.id("conversations")),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

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
      await ctx.db.patch(conversationId, { status: "thinking" });
    }

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

export const internalGetUserName = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    return user?.displayName ?? null;
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
    await ctx.db.patch(args.conversationId, { status: "active" });
    return messageId;
  },
});

export const setError = internalMutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, { status: "error" });
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
      disengagementCount: args.disengagementCount,
      stagnationCount: args.stagnationCount,
    });
    return messageId;
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
      status: "closed",
      verdict: args.verdict,
      score: args.score,
      stance: args.stance,
      category: args.category,
      estimatedPrice: args.estimatedPrice,
      item: args.item,
      disengagementCount: args.disengagementCount,
      stagnationCount: args.stagnationCount,
    });
    return messageId;
  },
});
