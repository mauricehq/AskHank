import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

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
    tokenUsage: v.object({
      promptTokens: v.number(),
      completionTokens: v.number(),
      totalTokens: v.number(),
    }),
    durationMs: v.number(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("llmTraces", {
      ...args,
      createdAt: Date.now(),
    });
  },
});
