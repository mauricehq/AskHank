import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/roles";

export const saveTrace = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    messageId: v.optional(v.id("messages")),
    systemPrompt: v.string(),
    messagesArray: v.string(),
    modelId: v.string(),
    temperature: v.number(),
    maxTokens: v.number(),
    rawResponse: v.string(),
    parsedResponse: v.string(),
    rawScores: v.string(),
    sanitizedScores: v.string(),
    scoringResult: v.string(),
    previousStance: v.string(),
    newStance: v.string(),
    decisionType: v.string(),
    category: v.optional(v.string()),
    estimatedPrice: v.optional(v.number()),
    disengagementCount: v.number(),
    stagnationCount: v.number(),
    tokenUsage: v.object({
      promptTokens: v.number(),
      completionTokens: v.number(),
      totalTokens: v.number(),
    }),
    durationMs: v.number(),
    toolCalled: v.optional(v.boolean()),
    toolArguments: v.optional(v.string()),
    toolResult: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("llmTraces", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const getTraceSummariesForConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const traces = await ctx.db
      .query("llmTraces")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();
    return traces.map((t) => {
      let item: string | undefined;
      try {
        const raw = JSON.parse(t.rawScores);
        if (typeof raw.item === "string" && raw.item !== "unknown") item = raw.item;
      } catch { /* ignore */ }

      return {
        _id: t._id,
        messageId: t.messageId,
        previousStance: t.previousStance,
        newStance: t.newStance,
        sanitizedScores: t.sanitizedScores,
        scoringResult: t.scoringResult,
        category: t.category,
        estimatedPrice: t.estimatedPrice,
        item,
        disengagementCount: t.disengagementCount,
        stagnationCount: t.stagnationCount,
        decisionType: t.decisionType,
        toolCalled: t.toolCalled,
        durationMs: t.durationMs,
        tokenUsage: t.tokenUsage,
        error: t.error,
      };
    });
  },
});

export const getFullTrace = query({
  args: { traceId: v.id("llmTraces") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.get(args.traceId);
  },
});
