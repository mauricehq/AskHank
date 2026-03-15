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
      const persistedContext = safeJsonParse(t.sanitizedScores);
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
        runningScore: scoring?.runningScore ?? null,
        delta: scoring?.delta ?? null,
        thresholdMultiplier: scoring?.thresholdMultiplier ?? null,
        priceModifier: scoring?.priceModifier ?? null,
        estimatedPrice: t.estimatedPrice ?? null,
        category: t.category ?? null,
        assessment: assessment?.item ? {
          item: assessment.item,
          intent: assessment.intent,
          estimated_price: assessment.estimated_price,
          category: assessment.category,
          challenge_addressed: assessment.challenge_addressed,
          evidence_provided: assessment.evidence_provided,
          new_angle: assessment.new_angle,
          emotional_reasoning: assessment.emotional_reasoning,
          challenge_topic: assessment.challenge_topic,
          is_non_answer: assessment.is_non_answer ?? toolArgs?.assessment?.is_non_answer,
          is_out_of_scope: assessment.is_out_of_scope ?? toolArgs?.assessment?.is_out_of_scope,
          user_backed_down: assessment.user_backed_down ?? toolArgs?.assessment?.user_backed_down,
          is_directed_question: assessment.is_directed_question ?? toolArgs?.assessment?.is_directed_question,
        } : null,
        persistedContext,
        call2SystemPrompt: t.call2SystemPrompt ?? null,
        call3SystemPrompt: t.call3SystemPrompt ?? null,
        call3RawResponse: t.call3RawResponse ?? null,
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
    call2SystemPrompt: v.optional(v.string()),
    call3SystemPrompt: v.optional(v.string()),
    call3RawResponse: v.optional(v.string()),
    toolCalled: v.optional(v.boolean()),
    toolArguments: v.optional(v.string()),
    toolResult: v.optional(v.string()),
    coalescingOverrides: v.optional(v.string()),
    estimatedCostUsd: v.optional(v.number()),
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
