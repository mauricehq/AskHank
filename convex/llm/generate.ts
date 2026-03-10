"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { chatCompletion } from "./openrouter";
import { buildSystemPrompt, buildMessages } from "./prompt";
import { computeScore, mapAssessmentToScores, applyStanceFloor, type Assessment, type Stance } from "./scoring";

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
  assessment: Assessment;
  category: string;
  estimated_price: number;
  is_non_answer: boolean;
  is_out_of_scope: boolean;
  has_new_information: boolean;
}

const DEFAULT_ASSESSMENT: Assessment = {
  item: "unknown",
  intent: "want",
  current_solution: "unknown",
  current_solution_detail: null,
  alternatives_tried: "unknown",
  alternatives_detail: null,
  frequency: "unknown",
  urgency: "none",
  urgency_detail: null,
  purchase_history: "unknown",
  emotional_triggers: [],
  specificity: "vague",
  consistency: "first_turn",
};

function sanitizeAssessment(raw: Record<string, unknown>): Assessment {
  return {
    item: typeof raw.item === "string" ? raw.item : DEFAULT_ASSESSMENT.item,
    intent: (["want", "need", "replace", "upgrade", "gift"] as const).includes(raw.intent as any)
      ? (raw.intent as Assessment["intent"])
      : DEFAULT_ASSESSMENT.intent,
    current_solution: (["none", "broken", "failing", "outdated", "working", "unknown"] as const).includes(raw.current_solution as any)
      ? (raw.current_solution as Assessment["current_solution"])
      : DEFAULT_ASSESSMENT.current_solution,
    current_solution_detail: typeof raw.current_solution_detail === "string" ? raw.current_solution_detail : null,
    alternatives_tried: (["exhausted", "some", "none", "unknown"] as const).includes(raw.alternatives_tried as any)
      ? (raw.alternatives_tried as Assessment["alternatives_tried"])
      : DEFAULT_ASSESSMENT.alternatives_tried,
    alternatives_detail: typeof raw.alternatives_detail === "string" ? raw.alternatives_detail : null,
    frequency: (["daily", "weekly", "monthly", "rarely", "unknown"] as const).includes(raw.frequency as any)
      ? (raw.frequency as Assessment["frequency"])
      : DEFAULT_ASSESSMENT.frequency,
    urgency: (["immediate", "soon", "none", "unknown"] as const).includes(raw.urgency as any)
      ? (raw.urgency as Assessment["urgency"])
      : DEFAULT_ASSESSMENT.urgency,
    urgency_detail: typeof raw.urgency_detail === "string" ? raw.urgency_detail : null,
    purchase_history: (["impulse_pattern", "planned", "unknown"] as const).includes(raw.purchase_history as any)
      ? (raw.purchase_history as Assessment["purchase_history"])
      : DEFAULT_ASSESSMENT.purchase_history,
    emotional_triggers: Array.isArray(raw.emotional_triggers)
      ? raw.emotional_triggers.filter((t: unknown) => typeof t === "string")
      : [],
    specificity: (["vague", "moderate", "specific", "evidence"] as const).includes(raw.specificity as any)
      ? (raw.specificity as Assessment["specificity"])
      : DEFAULT_ASSESSMENT.specificity,
    consistency: (["building", "consistent", "contradicting", "first_turn"] as const).includes(raw.consistency as any)
      ? (raw.consistency as Assessment["consistency"])
      : DEFAULT_ASSESSMENT.consistency,
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

  const rawAssessment =
    typeof parsed.assessment === "object" && parsed.assessment !== null
      ? (parsed.assessment as Record<string, unknown>)
      : {};

  return {
    response,
    assessment: sanitizeAssessment(rawAssessment),
    category: typeof parsed.category === "string" ? parsed.category : "other",
    estimated_price:
      typeof parsed.estimated_price === "number" ? parsed.estimated_price : 0,
    is_non_answer: parsed.is_non_answer === true,
    is_out_of_scope: parsed.is_out_of_scope === true,
    has_new_information: parsed.has_new_information !== false,
  };
}

type TraceData = Partial<{
  conversationId: Id<"conversations">;
  messageId: Id<"messages">;
  systemPrompt: string;
  messagesArray: string;
  modelId: string;
  temperature: number;
  maxTokens: number;
  rawResponse: string;
  parsedResponse: string;
  rawScores: string;
  sanitizedScores: string;
  scoringResult: string;
  previousStance: string;
  newStance: string;
  decisionType: string;
  category: string;
  estimatedPrice: number;
  disengagementCount: number;
  stagnationCount: number;
  tokenUsage: { promptTokens: number; completionTokens: number; totalTokens: number };
  durationMs: number;
  error: string;
}>;

export const respond = internalAction({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const traceData: TraceData = {
      conversationId: args.conversationId,
    };

    async function saveTraceQuietly() {
      try {
        await ctx.runMutation(internal.llmTraces.saveTrace, traceData as any);
      } catch (traceError) {
        console.error("Failed to save trace (non-fatal):", traceError);
      }
    }

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
      const stagnationCount = conversation.stagnationCount ?? 0;

      // Compute turn count from user messages
      const turnCount = messages.filter((m) => m.role === "user").length;

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
        estimatedPrice: conversation.estimatedPrice,
        category: conversation.category,
        stagnationCount,
        turnCount,
      });

      const llmMessages = buildMessages(
        systemPrompt,
        messages.map((m) => ({ role: m.role, content: m.content }))
      );

      // Capture input context for trace
      Object.assign(traceData, {
        previousStance: currentStance,
        systemPrompt,
        messagesArray: JSON.stringify(llmMessages),
        modelId,
        temperature: 0.8,
        maxTokens: 512,
        disengagementCount,
      });

      // 5. Call LLM with JSON mode
      const llmStart = Date.now();
      const result = await chatCompletion({
        messages: llmMessages,
        modelId,
        responseFormat: { type: "json_object" },
      });
      const durationMs = Date.now() - llmStart;
      Object.assign(traceData, {
        durationMs,
        rawResponse: result.content,
        tokenUsage: result.usage,
      });

      // Capture raw assessment before mapping
      try {
        const rawParsed = JSON.parse(result.content);
        traceData.rawScores = JSON.stringify(rawParsed.assessment ?? {});
      } catch {
        traceData.rawScores = "{}";
      }

      // 6. Parse JSON response and map assessment to scores
      const parsed = parseStructuredResponse(result.content);
      const mappedScores = mapAssessmentToScores(parsed.assessment);
      traceData.parsedResponse = JSON.stringify(parsed);
      traceData.sanitizedScores = JSON.stringify(mappedScores);

      // 7. Out of scope — save response, skip scoring
      if (parsed.is_out_of_scope) {
        const messageId = await ctx.runMutation(internal.conversations.saveResponse, {
          conversationId: args.conversationId,
          content: parsed.response,
        });
        Object.assign(traceData, {
          messageId,
          decisionType: "out-of-scope",
          newStance: currentStance,
          scoringResult: "{}",
          category: parsed.category,
          estimatedPrice: parsed.estimated_price > 0 ? parsed.estimated_price : undefined,
          disengagementCount,
          stagnationCount,
        });
        await saveTraceQuietly();
        return;
      }

      // 8. If stance was CONCEDE — this is an approval verdict
      if (currentStance === "CONCEDE") {
        const price = coalescePrice(parsed.estimated_price, conversation.estimatedPrice);
        const cat = coalesceCategory(parsed.category, conversation.category);
        const scoring = computeScore(mappedScores, price, cat);
        const messageId = await ctx.runMutation(internal.conversations.saveResponseWithVerdict, {
          conversationId: args.conversationId,
          content: parsed.response,
          verdict: "approved",
          score: scoring.score,
          stance: "CONCEDE",
          category: cat,
          estimatedPrice: price,
          disengagementCount,
          stagnationCount,
        });
        Object.assign(traceData, {
          messageId,
          decisionType: "concede",
          newStance: "CONCEDE",
          scoringResult: JSON.stringify(scoring),
          category: cat,
          estimatedPrice: price,
          disengagementCount,
          stagnationCount,
        });
        await saveTraceQuietly();
        return;
      }

      // 9. Run scoring with stance floor
      const estimatedPrice = coalescePrice(parsed.estimated_price, conversation.estimatedPrice);
      const category = coalesceCategory(parsed.category, conversation.category);
      const scoring = computeScore(mappedScores, estimatedPrice, category);
      const computedStance = scoring.stance;
      scoring.stance = applyStanceFloor(scoring.stance, turnCount);

      // 10. Handle disengagement
      if (parsed.is_non_answer) {
        if (disengagementCount >= 1) {
          // Second consecutive non-answer → denied verdict
          const messageId = await ctx.runMutation(
            internal.conversations.saveResponseWithVerdict,
            {
              conversationId: args.conversationId,
              content: parsed.response,
              verdict: "denied",
              score: scoring.score,
              stance: scoring.stance,
              category,
              estimatedPrice,
              disengagementCount: disengagementCount + 1,
              stagnationCount,
            }
          );
          Object.assign(traceData, {
            messageId,
            decisionType: "disengagement-denied",
            newStance: scoring.stance,
            scoringResult: JSON.stringify(scoring),
            category,
            estimatedPrice,
            disengagementCount: disengagementCount + 1,
            stagnationCount,
          });
          await saveTraceQuietly();
          return;
        }
        // First non-answer → increment count
        const messageId = await ctx.runMutation(
          internal.conversations.saveResponseWithScoring,
          {
            conversationId: args.conversationId,
            content: parsed.response,
            score: scoring.score,
            stance: scoring.stance,
            category,
            estimatedPrice,
            disengagementCount: 1,
            stagnationCount,
          }
        );
        Object.assign(traceData, {
          messageId,
          decisionType: "disengagement-increment",
          newStance: scoring.stance,
          scoringResult: JSON.stringify(scoring),
          category,
          estimatedPrice,
          disengagementCount: 1,
          stagnationCount,
        });
        await saveTraceQuietly();
        return;
      }

      // 11. Handle stagnation (repeating arguments without new info)
      if (!parsed.has_new_information && !parsed.is_non_answer) {
        const newStagnation = stagnationCount + 1;
        if (newStagnation >= 4) {
          // Stagnation closure — denied verdict
          const messageId = await ctx.runMutation(
            internal.conversations.saveResponseWithVerdict,
            {
              conversationId: args.conversationId,
              content: parsed.response,
              verdict: "denied",
              score: scoring.score,
              stance: scoring.stance,
              category,
              estimatedPrice,
              disengagementCount: 0,
              stagnationCount: newStagnation,
            }
          );
          Object.assign(traceData, {
            messageId,
            decisionType: "stagnation-denied",
            newStance: scoring.stance,
            scoringResult: JSON.stringify(scoring),
            category,
            estimatedPrice,
            disengagementCount: 0,
            stagnationCount: newStagnation,
          });
          await saveTraceQuietly();
          return;
        }
        // Increment stagnation
        const messageId = await ctx.runMutation(
          internal.conversations.saveResponseWithScoring,
          {
            conversationId: args.conversationId,
            content: parsed.response,
            score: scoring.score,
            stance: scoring.stance,
            category,
            estimatedPrice,
            disengagementCount: 0,
            stagnationCount: newStagnation,
          }
        );
        Object.assign(traceData, {
          messageId,
          decisionType: "stagnation-increment",
          newStance: scoring.stance,
          scoringResult: JSON.stringify(scoring),
          category,
          estimatedPrice,
          disengagementCount: 0,
          stagnationCount: newStagnation,
        });
        await saveTraceQuietly();
        return;
      }

      // 12. Normal turn — save with scoring, reset disengagement and stagnation
      const messageId = await ctx.runMutation(internal.conversations.saveResponseWithScoring, {
        conversationId: args.conversationId,
        content: parsed.response,
        score: scoring.score,
        stance: scoring.stance,
        category,
        estimatedPrice,
        disengagementCount: 0,
        stagnationCount: 0,
      });
      Object.assign(traceData, {
        messageId,
        decisionType: computedStance !== scoring.stance ? "normal (stance floored)" : "normal",
        newStance: scoring.stance,
        scoringResult: JSON.stringify(scoring),
        category,
        estimatedPrice,
        disengagementCount: 0,
        stagnationCount: 0,
      });
      await saveTraceQuietly();
    } catch (error) {
      console.error("LLM generation failed:", error);
      // Save error trace if we got past the LLM call
      if (traceData.rawResponse) {
        Object.assign(traceData, {
          decisionType: "error",
          error: String(error),
          newStance: traceData.previousStance ?? "FIRM",
          parsedResponse: traceData.parsedResponse ?? "{}",
          sanitizedScores: traceData.sanitizedScores ?? "{}",
          rawScores: traceData.rawScores ?? "{}",
          scoringResult: traceData.scoringResult ?? "{}",
          disengagementCount: traceData.disengagementCount ?? 0,
          stagnationCount: traceData.stagnationCount ?? 0,
        });
        await saveTraceQuietly();
      }
      await ctx.runMutation(internal.conversations.setError, {
        conversationId: args.conversationId,
      });
    }
  },
});
