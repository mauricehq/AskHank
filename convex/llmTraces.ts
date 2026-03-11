import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { requireAdmin } from "./lib/roles";

function safeJsonParse(str: string | undefined): any {
  if (!str) return null;
  try { return JSON.parse(str); } catch { return null; }
}

export const debugDump = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const traces = await ctx.db
      .query("llmTraces")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    // Build ordered list so we can find the user message before each hank response
    const msgById = new Map(messages.map((m) => [m._id, m]));
    const orderedMsgs = [...messages].sort((a, b) => a.createdAt - b.createdAt);

    return traces.map((t, i) => {
      const assessment = safeJsonParse(t.rawScores);
      const coalescingOverrides = safeJsonParse(t.coalescingOverrides);
      const scores = safeJsonParse(t.sanitizedScores);
      const scoring = safeJsonParse(t.scoringResult);
      const toolArgs = safeJsonParse(t.toolArguments);

      // Find user message that triggered this trace and hank's response
      let userMessage: string | null = null;
      let hankResponse: string | null = null;
      if (t.messageId) {
        const hankMsg = msgById.get(t.messageId);
        if (hankMsg) {
          hankResponse = hankMsg.content;
          // User message is the one right before hank's response
          const idx = orderedMsgs.findIndex((m) => m._id === t.messageId);
          if (idx > 0 && orderedMsgs[idx - 1].role === "user") {
            userMessage = orderedMsgs[idx - 1].content;
          }
        }
      }

      return {
        turn: i + 1,
        userMessage,
        hankResponse,
        stance: `${t.previousStance} → ${t.newStance}`,
        decisionType: t.decisionType,
        score: scoring?.score ?? null,
        rawScore: scoring?.rawScore ?? null,
        thresholdMultiplier: scoring?.thresholdMultiplier ?? null,
        priceModifier: scoring?.priceModifier ?? null,
        positioningModifier: scoring?.positioningModifier ?? null,
        estimatedPrice: t.estimatedPrice ?? null,
        category: t.category ?? null,
        assessment: assessment?.intent ? {
          item: assessment.item,
          intent: assessment.intent,
          current_solution: assessment.current_solution,
          alternatives_tried: assessment.alternatives_tried,
          frequency: assessment.frequency,
          urgency: assessment.urgency,
          purchase_history: assessment.purchase_history,
          specificity: assessment.specificity,
          consistency: assessment.consistency,
          beneficiary: assessment.beneficiary,
          price_positioning: assessment.price_positioning,
          emotional_triggers: assessment.emotional_triggers,
          estimated_price: assessment.estimated_price,
          category: assessment.category,
          is_non_answer: assessment.is_non_answer ?? toolArgs?.is_non_answer,
          has_new_information: assessment.has_new_information ?? toolArgs?.has_new_information,
          is_out_of_scope: assessment.is_out_of_scope ?? toolArgs?.is_out_of_scope,
          user_backed_down: assessment.user_backed_down ?? toolArgs?.user_backed_down,
        } : null,
        coalescingOverrides,
        mappedScores: scores,
        tokens: t.tokenUsage?.totalTokens ?? null,
        durationMs: t.durationMs,
      };
    });
  },
});

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
    coalescingOverrides: v.optional(v.string()),
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
      return {
        _id: t._id,
        messageId: t.messageId,
        previousStance: t.previousStance,
        newStance: t.newStance,
        rawScores: t.rawScores,
        sanitizedScores: t.sanitizedScores,
        scoringResult: t.scoringResult,
        category: t.category,
        estimatedPrice: t.estimatedPrice,
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
