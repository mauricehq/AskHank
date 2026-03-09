"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { chatCompletion } from "./openrouter";
import { buildSystemPrompt, buildMessages } from "./prompt";
import { computeScore, type ExtractedScores, type Stance } from "./scoring";

const VALID_STANCES = new Set<string>(["IMMOVABLE", "FIRM", "SKEPTICAL", "RELUCTANT", "CONCEDE"]);

function toStance(value: string | undefined): Stance {
  return value && VALID_STANCES.has(value) ? (value as Stance) : "FIRM";
}

// Coalesce price: prefer new LLM estimate, fall back to stored value.
// 0 means "unclear" so we treat it as no-value.
function coalescePrice(llmPrice: number, stored?: number): number | undefined {
  return llmPrice > 0 ? llmPrice : (stored ?? undefined);
}

// Coalesce category: prefer new LLM category, fall back to stored value.
function coalesceCategory(llmCategory: string, stored?: string): string {
  return llmCategory && llmCategory !== "other" ? llmCategory : (stored || llmCategory || "other");
}

interface StructuredResponse {
  response: string;
  scores: ExtractedScores;
  category: string;
  estimated_price: number;
  is_non_answer: boolean;
  is_out_of_scope: boolean;
}

function clampScore(val: unknown, min: number, max: number, fallback: number): number {
  const n = typeof val === "number" ? val : fallback;
  return Math.max(min, Math.min(max, n));
}

function sanitizeScores(raw: Record<string, unknown>): ExtractedScores {
  return {
    functional_gap: clampScore(raw.functional_gap, 0, 10, 0),
    current_state: clampScore(raw.current_state, 0, 10, 0),
    alternatives_owned: clampScore(raw.alternatives_owned, 0, 10, 0),
    frequency_of_use: clampScore(raw.frequency_of_use, 0, 10, 0),
    urgency: clampScore(raw.urgency, 0, 10, 0),
    pattern_history: clampScore(raw.pattern_history, 0, 10, 3),
    emotional_reasoning: clampScore(raw.emotional_reasoning, -10, 0, 0),
    specificity: clampScore(raw.specificity, 0.3, 1.5, 1.0),
    consistency: clampScore(raw.consistency, 0.0, 1.2, 1.0),
  };
}

function parseStructuredResponse(content: string): StructuredResponse {
  // Try direct JSON parse
  try {
    const parsed = JSON.parse(content);
    return validateParsed(parsed);
  } catch {
    // Fall through to regex extraction
  }

  // Try extracting JSON from markdown code blocks
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1].trim());
      return validateParsed(parsed);
    } catch {
      // Fall through
    }
  }

  // Try finding JSON object in the content
  const braceMatch = content.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try {
      const parsed = JSON.parse(braceMatch[0]);
      return validateParsed(parsed);
    } catch {
      // Fall through
    }
  }

  // Complete failure — treat entire content as response with default scores
  throw new Error("Failed to parse structured response from LLM output");
}

function validateParsed(parsed: Record<string, unknown>): StructuredResponse {
  const response = typeof parsed.response === "string" ? parsed.response : "";
  if (!response) {
    throw new Error("Parsed JSON has no response field");
  }

  const rawScores =
    typeof parsed.scores === "object" && parsed.scores !== null
      ? (parsed.scores as Record<string, unknown>)
      : {};

  return {
    response,
    scores: sanitizeScores(rawScores),
    category: typeof parsed.category === "string" ? parsed.category : "other",
    estimated_price:
      typeof parsed.estimated_price === "number" ? parsed.estimated_price : 0,
    is_non_answer: parsed.is_non_answer === true,
    is_out_of_scope: parsed.is_out_of_scope === true,
  };
}

export const respond = internalAction({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    try {
      // 1. Fetch messages
      const messages = await ctx.runQuery(
        internal.conversations.internalGetMessages,
        { conversationId: args.conversationId }
      );

      // 2. Fetch conversation state (for stance, disengagementCount)
      const conversation = await ctx.runQuery(
        internal.conversations.internalGetConversation,
        { conversationId: args.conversationId }
      );
      if (!conversation) throw new Error("Conversation not found");

      const currentStance = toStance(conversation.stance);
      const disengagementCount = conversation.disengagementCount ?? 0;

      // 3. Fetch model + display name
      const modelId = (await ctx.runQuery(
        internal.conversations.internalGetSetting,
        { key: "hank_model" }
      )) as string;

      const displayName = await ctx.runQuery(
        internal.conversations.internalGetUserName,
        { userId: args.userId }
      );

      // 4. Build prompt with dynamic config
      const systemPrompt = buildSystemPrompt({
        displayName: displayName ?? undefined,
        stance: currentStance,
        disengagementCount,
      });

      const llmMessages = buildMessages(
        systemPrompt,
        messages.map((m) => ({ role: m.role, content: m.content }))
      );

      // 5. Call LLM with JSON mode
      const result = await chatCompletion({
        messages: llmMessages,
        modelId,
        responseFormat: { type: "json_object" },
      });

      // 6. Parse JSON response
      const parsed = parseStructuredResponse(result.content);

      // 7. Out of scope — save response, skip scoring
      if (parsed.is_out_of_scope) {
        await ctx.runMutation(internal.conversations.saveResponse, {
          conversationId: args.conversationId,
          content: parsed.response,
        });
        return;
      }

      // 8. If stance was CONCEDE — this is an approval verdict
      if (currentStance === "CONCEDE") {
        const price = coalescePrice(parsed.estimated_price, conversation.estimatedPrice);
        const cat = coalesceCategory(parsed.category, conversation.category);
        const scoring = computeScore(parsed.scores, price, cat);
        await ctx.runMutation(internal.conversations.saveResponseWithVerdict, {
          conversationId: args.conversationId,
          content: parsed.response,
          verdict: "approved",
          score: scoring.score,
          stance: "CONCEDE",
          category: cat,
          estimatedPrice: price,
        });
        return;
      }

      // 9. Run scoring
      const estimatedPrice = coalescePrice(parsed.estimated_price, conversation.estimatedPrice);
      const category = coalesceCategory(parsed.category, conversation.category);
      const scoring = computeScore(parsed.scores, estimatedPrice, category);

      // 10. Handle disengagement
      if (parsed.is_non_answer) {
        if (disengagementCount >= 1) {
          // Second consecutive non-answer → denied verdict
          await ctx.runMutation(
            internal.conversations.saveResponseWithVerdict,
            {
              conversationId: args.conversationId,
              content: parsed.response,
              verdict: "denied",
              score: scoring.score,
              stance: scoring.stance,
              category,
              estimatedPrice,
            }
          );
          return;
        }
        // First non-answer → increment count
        await ctx.runMutation(
          internal.conversations.saveResponseWithScoring,
          {
            conversationId: args.conversationId,
            content: parsed.response,
            score: scoring.score,
            stance: scoring.stance,
            category,
            estimatedPrice,
            disengagementCount: 1,
          }
        );
        return;
      }

      // 11. Normal turn — save with scoring, reset disengagement
      await ctx.runMutation(internal.conversations.saveResponseWithScoring, {
        conversationId: args.conversationId,
        content: parsed.response,
        score: scoring.score,
        stance: scoring.stance,
        category,
        estimatedPrice,
        disengagementCount: 0,
      });
    } catch (error) {
      console.error("LLM generation failed:", error);
      await ctx.runMutation(internal.conversations.setError, {
        conversationId: args.conversationId,
      });
    }
  },
});
