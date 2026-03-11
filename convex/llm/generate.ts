"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { chatCompletion, type ChatMessage } from "./openrouter";
import { buildSystemPrompt, buildMessages, buildToolDefinition } from "./prompt";
import {
  computeScore,
  mapAssessmentToScores,
  applyStanceGuardrails,
  type Assessment,
  type Stance,
  type ExtractedScores,
  type ScoringResult,
} from "./scoring";

const VALID_STANCES = new Set<string>(["IMMOVABLE", "FIRM", "SKEPTICAL", "RELUCTANT", "CONCEDE"]);

function toStance(value: string | undefined): Stance {
  return value && VALID_STANCES.has(value) ? (value as Stance) : "FIRM";
}

function coalesceItem(llmItem: string | undefined, stored?: string): string | undefined {
  return llmItem && llmItem !== "unknown" ? llmItem : (stored ?? undefined);
}

const ALTERNATIVES_ORDER: Assessment["alternatives_tried"][] =
  ["unknown", "none", "some", "exhausted"];
const SPECIFICITY_ORDER: Assessment["specificity"][] =
  ["vague", "moderate", "specific", "evidence"];
const FREQUENCY_ORDER: Assessment["frequency"][] =
  ["unknown", "rarely", "monthly", "weekly", "daily"];
const URGENCY_ORDER: Assessment["urgency"][] =
  ["unknown", "none", "soon", "immediate"];
const CURRENT_SOLUTION_ORDER: Assessment["current_solution"][] =
  ["unknown", "working", "outdated", "none", "failing", "broken"];
const INTENT_ORDER: Assessment["intent"][] =
  ["want", "upgrade", "gift", "need", "replace"];
const BENEFICIARY_ORDER: Assessment["beneficiary"][] =
  ["gift_discretionary", "self", "shared", "dependent"];
const PURCHASE_HISTORY_ORDER: Assessment["purchase_history"][] =
  ["unknown", "impulse_pattern", "planned"];
const PRICE_POSITIONING_ORDER: Assessment["price_positioning"][] =
  ["budget", "standard", "premium", "luxury"];
function coalesceMonotonic<T>(newVal: T, prevVal: T, order: T[]): T {
  const prevIdx = order.indexOf(prevVal);
  const newIdx = order.indexOf(newVal);
  if (prevIdx === -1) return newVal;
  if (newIdx === -1) return prevVal;
  return newIdx >= prevIdx ? newVal : prevVal;
}

function assessmentCoalescingDiff(
  raw: Assessment,
  coalesced: Assessment,
): Record<string, { llm: unknown; kept: unknown }> | null {
  const diff: Record<string, { llm: unknown; kept: unknown }> = {};
  for (const key of Object.keys(raw) as (keyof Assessment)[]) {
    const rawVal = raw[key];
    const coalescedVal = coalesced[key];
    if (JSON.stringify(rawVal) !== JSON.stringify(coalescedVal)) {
      diff[key] = { llm: rawVal, kept: coalescedVal };
    }
  }
  return Object.keys(diff).length > 0 ? diff : null;
}

function coalesceAssessment(current: Assessment, prev: Assessment | null): Assessment {
  if (!prev) return current;

  const contradicting = current.consistency === "contradicting";

  return {
    ...current,
    // Pure monotonic (existing) — never regress, even on contradiction
    alternatives_tried: coalesceMonotonic(current.alternatives_tried, prev.alternatives_tried, ALTERNATIVES_ORDER),
    specificity: coalesceMonotonic(current.specificity, prev.specificity, SPECIFICITY_ORDER),

    // Monotonic unless contradicting — ordered fields
    frequency: contradicting
      ? current.frequency
      : coalesceMonotonic(current.frequency, prev.frequency, FREQUENCY_ORDER),
    urgency: contradicting
      ? current.urgency
      : coalesceMonotonic(current.urgency, prev.urgency, URGENCY_ORDER),
    current_solution: contradicting
      ? current.current_solution
      : coalesceMonotonic(current.current_solution, prev.current_solution, CURRENT_SOLUTION_ORDER),

    intent: contradicting
      ? current.intent
      : coalesceMonotonic(current.intent, prev.intent, INTENT_ORDER),

    // Monotonic unless contradicting — beneficiary, purchase_history, price_positioning
    beneficiary: contradicting
      ? current.beneficiary
      : coalesceMonotonic(current.beneficiary, prev.beneficiary, BENEFICIARY_ORDER),
    purchase_history: contradicting
      ? current.purchase_history
      : coalesceMonotonic(current.purchase_history, prev.purchase_history, PURCHASE_HISTORY_ORDER),
    price_positioning: contradicting
      ? current.price_positioning
      : coalesceMonotonic(current.price_positioning, prev.price_positioning, PRICE_POSITIONING_ORDER),

    // Array union unless contradicting
    emotional_triggers: contradicting
      ? current.emotional_triggers
      : [...new Set([...prev.emotional_triggers, ...current.emotional_triggers])],

    // Null-fill (existing)
    alternatives_detail: current.alternatives_detail ?? prev.alternatives_detail,
    current_solution_detail: current.current_solution_detail ?? prev.current_solution_detail,
    urgency_detail: current.urgency_detail ?? prev.urgency_detail,

    // Price: keep previous if current is 0 (unknown)
    estimated_price: current.estimated_price > 0 ? current.estimated_price : prev.estimated_price,
    // Category: keep previous if current is "other" (unknown)
    category: current.category && current.category !== "other" ? current.category : prev.category,
  };
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
  beneficiary: "self",
  price_positioning: "standard",
  estimated_price: 0,
  category: "other",
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
    beneficiary: (["self", "shared", "dependent", "gift_discretionary"] as const).includes(raw.beneficiary as any)
      ? (raw.beneficiary as Assessment["beneficiary"])
      : DEFAULT_ASSESSMENT.beneficiary,
    price_positioning: (["budget", "standard", "premium", "luxury"] as const).includes(raw.price_positioning as any)
      ? (raw.price_positioning as Assessment["price_positioning"])
      : DEFAULT_ASSESSMENT.price_positioning,
    estimated_price: typeof raw.estimated_price === "number" ? raw.estimated_price : 0,
    category: (["electronics", "cars", "fashion", "furniture", "essentials", "safety_health", "other"] as const).includes(raw.category as any)
      ? (raw.category as string)
      : "other",
  };
}

// --- Tool result types ---

interface GetStanceResult {
  stance: Stance;
  score: number;
  guidance: string;
  verdict?: "approved" | "denied";
  closing?: boolean;
  // Internal fields (not sent to LLM)
  _disengagementCount: number;
  _stagnationCount: number;
  _category: string;
  _estimatedPrice?: number;
  _item?: string;
  _decisionType: string;
  _mappedScores: ExtractedScores;
  _scoringResult: ScoringResult;
  _coalescedAssessment: Assessment;
}

interface ToolArguments {
  assessment: Record<string, unknown>;
  is_non_answer: boolean;
  has_new_information: boolean;
  is_out_of_scope: boolean;
  user_backed_down: boolean;
}

interface ConversationState {
  currentStance: Stance;
  disengagementCount: number;
  stagnationCount: number;
  storedItem?: string;
  turnCount: number;
  previousAssessment?: Assessment | null;
}

function executeGetStance(input: ToolArguments, state: ConversationState): GetStanceResult {
  const { currentStance, disengagementCount, stagnationCount, storedItem, turnCount } = state;

  const rawAssessment = sanitizeAssessment(input.assessment);
  const assessment = coalesceAssessment(rawAssessment, state.previousAssessment ?? null);
  const estimatedPrice = assessment.estimated_price > 0 ? assessment.estimated_price : undefined;
  const category = assessment.category;
  const item = coalesceItem(assessment.item, storedItem);

  // 1. Out of scope → no scoring, deflect
  if (input.is_out_of_scope) {
    const dummyScores = mapAssessmentToScores(DEFAULT_ASSESSMENT);
    return {
      stance: currentStance,
      score: 0,
      guidance: "This is out of scope. Deflect with personality using the OUT OF SCOPE guidelines.",
      _disengagementCount: disengagementCount,
      _stagnationCount: stagnationCount,
      _category: category,
      _estimatedPrice: estimatedPrice,
      _item: item,
      _decisionType: "out-of-scope",
      _mappedScores: dummyScores,
      _scoringResult: { rawScore: 0, score: 0, stance: currentStance, thresholdMultiplier: 1, priceModifier: 1, positioningModifier: 1 },
      _coalescedAssessment: state.previousAssessment ?? DEFAULT_ASSESSMENT,
    };
  }

  // 2. Previous stance was CONCEDE → approval verdict
  if (currentStance === "CONCEDE") {
    const mappedScores = mapAssessmentToScores(assessment);
    const scoring = computeScore(mappedScores, assessment);
    return {
      stance: "CONCEDE",
      score: scoring.score,
      guidance: "You already conceded. Give a grudging approval with a final warning about spending.",
      verdict: "approved",
      closing: true,
      _disengagementCount: disengagementCount,
      _stagnationCount: stagnationCount,
      _category: category,
      _estimatedPrice: estimatedPrice,
      _item: item,
      _decisionType: "concede",
      _mappedScores: mappedScores,
      _scoringResult: scoring,
      _coalescedAssessment: assessment,
    };
  }

  // 3-8: Score and apply guardrails. Never mutate scoring — keep raw for traces.
  const mappedScores = mapAssessmentToScores(assessment);
  const scoring = computeScore(mappedScores, assessment);
  const guardrailedStance = applyStanceGuardrails(scoring.stance, currentStance, turnCount);

  // 3. User backed down → denied verdict (Hank wins)
  if (input.user_backed_down) {
    return {
      stance: guardrailedStance,
      score: scoring.score,
      guidance: "Victory. The user backed down. Give a brief, dry, memorable closing line. Don't pile on — they made the right call and you both know it.",
      verdict: "denied",
      closing: true,
      _disengagementCount: 0,
      _stagnationCount: 0,
      _category: category,
      _estimatedPrice: estimatedPrice,
      _item: item,
      _decisionType: "user-backed-down",
      _mappedScores: mappedScores,
      _scoringResult: scoring,
      _coalescedAssessment: assessment,
    };
  }

  // 4. Non-answer + count >= 1 → denied verdict
  if (input.is_non_answer && disengagementCount >= 1) {
    return {
      stance: guardrailedStance,
      score: scoring.score,
      guidance: "The user has disengaged. Deliver a memorable closing denial. Make it punchy and final.",
      verdict: "denied",
      closing: true,
      _disengagementCount: disengagementCount + 1,
      _stagnationCount: stagnationCount,
      _category: category,
      _estimatedPrice: estimatedPrice,
      _item: item,
      _decisionType: "disengagement-denied",
      _mappedScores: mappedScores,
      _scoringResult: scoring,
      _coalescedAssessment: assessment,
    };
  }

  // 5. Non-answer (first) → increment counter, warning
  if (input.is_non_answer) {
    return {
      stance: guardrailedStance,
      score: scoring.score,
      guidance: `The user gave a non-answer. Stay at your stance. Push them to make a real argument. Something like "That's not an argument. What's actually wrong with what you have now."`,
      _disengagementCount: 1,
      _stagnationCount: stagnationCount,
      _category: category,
      _estimatedPrice: estimatedPrice,
      _item: item,
      _decisionType: "disengagement-increment",
      _mappedScores: mappedScores,
      _scoringResult: scoring,
      _coalescedAssessment: assessment,
    };
  }

  // 6. No new information + count >= 4 → stagnation closure
  if (!input.has_new_information && stagnationCount >= 3) {
    return {
      stance: guardrailedStance,
      score: scoring.score,
      guidance: `The user has repeated themselves ${stagnationCount + 1} times without new information. Deliver a final denial. Make it memorable. Something like "You've said the same thing ${stagnationCount + 1} different ways. The answer was no the first time. We're done."`,
      verdict: "denied",
      closing: true,
      _disengagementCount: 0,
      _stagnationCount: stagnationCount + 1,
      _category: category,
      _estimatedPrice: estimatedPrice,
      _item: item,
      _decisionType: "stagnation-denied",
      _mappedScores: mappedScores,
      _scoringResult: scoring,
      _coalescedAssessment: assessment,
    };
  }

  // 7. No new information (count < 4) → increment, escalating guidance
  if (!input.has_new_information) {
    const newStagnation = stagnationCount + 1;

    const stagnationGuidance: Record<number, string> = {
      1: `They're repeating themselves. Call it out. "You said that already. Got anything new?"`,
      2: `Still repeating. Warn them. "We've been going in circles. I need something I haven't heard."`,
      3: `Last chance. "I've heard everything you've got. Last shot — give me something new or we're done."`,
    };
    const guidance = stagnationGuidance[newStagnation] ??
      `They've repeated themselves ${newStagnation} times. Push hard for something new.`;

    return {
      stance: guardrailedStance,
      score: scoring.score,
      guidance,
      _disengagementCount: 0,
      _stagnationCount: newStagnation,
      _category: category,
      _estimatedPrice: estimatedPrice,
      _item: item,
      _decisionType: "stagnation-increment",
      _mappedScores: mappedScores,
      _scoringResult: scoring,
      _coalescedAssessment: assessment,
    };
  }

  // 8. Normal turn — return new stance
  const stanceGuidance: Record<Stance, string> = {
    IMMOVABLE: "Pure impulse. No valid case whatsoever. Push hard.",
    FIRM: "Weak case. Don't concede unless overwhelming evidence.",
    SKEPTICAL: "Half a case. Acknowledge what's valid, push on what's weak.",
    RELUCTANT: "Strong case but not fully convinced. Push for final proof.",
    CONCEDE: "They've made a genuinely strong case. Concede reluctantly with a final warning.",
  };

  return {
    stance: guardrailedStance,
    score: scoring.score,
    guidance: stanceGuidance[guardrailedStance],
    verdict: guardrailedStance === "CONCEDE" ? "approved" : undefined,
    closing: guardrailedStance === "CONCEDE" ? true : undefined,
    _disengagementCount: 0,
    _stagnationCount: 0,
    _category: category,
    _estimatedPrice: estimatedPrice,
    _item: item,
    _decisionType: scoring.stance !== guardrailedStance ? "normal (stance floored)" : "normal",
    _mappedScores: mappedScores,
    _scoringResult: scoring,
    _coalescedAssessment: assessment,
  };
}

// --- Trace data type ---

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
  toolCalled: boolean;
  toolArguments: string;
  toolResult: string;
  coalescingOverrides: string;
}>;

function addUsage(
  a: { promptTokens: number; completionTokens: number; totalTokens: number },
  b: { promptTokens: number; completionTokens: number; totalTokens: number }
) {
  return {
    promptTokens: a.promptTokens + b.promptTokens,
    completionTokens: a.completionTokens + b.completionTokens,
    totalTokens: a.totalTokens + b.totalTokens,
  };
}

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
      // 1. Fetch context
      const messages = await ctx.runQuery(
        internal.conversations.internalGetMessages,
        { conversationId: args.conversationId }
      );

      const conversation = await ctx.runQuery(
        internal.conversations.internalGetConversation,
        { conversationId: args.conversationId }
      );
      if (!conversation) throw new Error("Conversation not found");

      const currentStance = toStance(conversation.stance);
      const disengagementCount = conversation.disengagementCount ?? 0;
      const stagnationCount = conversation.stagnationCount ?? 0;
      const turnCount = messages.filter((m) => m.role === "user").length;

      // Parse previous assessment for consistency
      let previousAssessment: Assessment | null = null;
      if (conversation.lastAssessment) {
        try {
          previousAssessment = sanitizeAssessment(JSON.parse(conversation.lastAssessment));
        } catch {
          previousAssessment = null;
        }
      }

      const modelId = (await ctx.runQuery(
        internal.conversations.internalGetSetting,
        { key: "hank_model" }
      )) as string;

      const displayName = await ctx.runQuery(
        internal.conversations.internalGetUserName,
        { userId: args.userId }
      );

      // 2. Build prompt (v2 — no assessment guidelines, has tool instructions)
      // Prefer previousAssessment (canonical source after move into assessment)
      // with conversation fields as fallback for older conversations
      const systemPrompt = buildSystemPrompt({
        displayName: displayName ?? undefined,
        stance: currentStance,
        disengagementCount,
        estimatedPrice: previousAssessment?.estimated_price ?? conversation.estimatedPrice,
        category: previousAssessment?.category ?? conversation.category,
        stagnationCount,
        turnCount,
        previousAssessment: previousAssessment as Record<string, unknown> | null,
      });

      const llmMessages = buildMessages(
        systemPrompt,
        messages.map((m) => ({ role: m.role, content: m.content }))
      );

      // 3. Build tool definition
      const toolDef = buildToolDefinition();

      // Capture input context for trace
      Object.assign(traceData, {
        previousStance: currentStance,
        systemPrompt,
        messagesArray: JSON.stringify(llmMessages),
        modelId,
        temperature: 0.8,
        maxTokens: 300,
        disengagementCount,
        stagnationCount,
      });

      // 4. CALL 1: LLM with tool available
      const llmStart = Date.now();
      const call1 = await chatCompletion({
        messages: llmMessages,
        modelId,
        maxTokens: 300,
        tools: [toolDef],
        tool_choice: { type: "function", function: { name: "get_stance" } },
      });

      let toolCall = call1.toolCalls?.[0];
      let call1Usage = call1.usage;

      // Retry once if tool call missing (model occasionally skips despite tool_choice)
      if (!toolCall || toolCall.function.name !== "get_stance") {
        console.warn("LLM skipped tool — retrying (attempt 2)");
        const retry = await chatCompletion({
          messages: llmMessages,
          modelId,
          maxTokens: 300,
          tools: [toolDef],
          tool_choice: { type: "function", function: { name: "get_stance" } },
        });
        call1Usage = addUsage(call1.usage, retry.usage);
        const retryToolCall = retry.toolCalls?.[0];
        if (retryToolCall && retryToolCall.function.name === "get_stance") {
          toolCall = retryToolCall;
        }
      }

      // 5. BRANCH — only handle get_stance; other tool names treated as casual
      //    If LLM returned only tool_calls with wrong name (no content), re-call without tools
      if (toolCall && toolCall.function.name === "get_stance") {
        // --- A) Tool called (scoring turn) ---
        traceData.toolCalled = true;

        // Parse tool arguments defensively
        let toolArgs: ToolArguments;
        try {
          const raw = JSON.parse(toolCall.function.arguments);
          toolArgs = {
            assessment: typeof raw.assessment === "object" && raw.assessment !== null ? raw.assessment : {},
            is_non_answer: raw.is_non_answer === true,
            has_new_information: raw.has_new_information !== false,
            is_out_of_scope: raw.is_out_of_scope === true,
            user_backed_down: raw.user_backed_down === true,
          };
        } catch {
          // Malformed tool args → fall back to defaults
          toolArgs = {
            assessment: {},
            is_non_answer: false,
            has_new_information: true,
            is_out_of_scope: false,
            user_backed_down: false,
          };
        }
        traceData.toolArguments = JSON.stringify(toolArgs);

        // Execute scoring
        const stanceResult = executeGetStance(toolArgs, {
          currentStance,
          disengagementCount,
          stagnationCount,
          storedItem: conversation.item,
          turnCount,
          previousAssessment,
        });

        // Build tool result for LLM (only public fields)
        const toolResultForLLM: Record<string, unknown> = {
          stance: stanceResult.stance,
          score: stanceResult.score,
          guidance: stanceResult.guidance,
        };
        if (stanceResult.verdict) toolResultForLLM.verdict = stanceResult.verdict;
        if (stanceResult.closing) toolResultForLLM.closing = stanceResult.closing;

        const toolResultStr = JSON.stringify(toolResultForLLM);
        traceData.toolResult = toolResultStr;

        // Build messages for call 2: original messages + assistant tool call + tool result
        const call2Messages: ChatMessage[] = [
          ...llmMessages,
          {
            role: "assistant",
            content: null,
            tool_calls: [toolCall],
          },
          {
            role: "tool",
            tool_call_id: toolCall.id,
            content: toolResultStr,
          },
        ];

        // CALL 2: LLM generates response using stance guidance
        const call2 = await chatCompletion({
          messages: call2Messages,
          modelId,
          maxTokens: 400,
        });

        const durationMs = Date.now() - llmStart;
        const totalUsage = addUsage(call1Usage, call2.usage);
        const responseText = call2.content;
        if (!responseText) {
          throw new Error("Call 2 returned empty content");
        }

        // Capture trace data
        const rawAssessment = sanitizeAssessment(
          typeof toolArgs.assessment === "object" && toolArgs.assessment !== null
            ? (toolArgs.assessment as Record<string, unknown>)
            : {}
        );
        const coalescingDiff = assessmentCoalescingDiff(rawAssessment, stanceResult._coalescedAssessment);

        Object.assign(traceData, {
          durationMs,
          rawResponse: responseText,
          tokenUsage: totalUsage,
          rawScores: JSON.stringify(rawAssessment),
          coalescingOverrides: coalescingDiff ? JSON.stringify(coalescingDiff) : undefined,
          sanitizedScores: JSON.stringify(stanceResult._mappedScores),
          scoringResult: JSON.stringify(stanceResult._scoringResult),
          parsedResponse: JSON.stringify({ response: responseText, toolArgs }),
          decisionType: stanceResult._decisionType,
          newStance: stanceResult.stance,
          category: stanceResult._category,
          estimatedPrice: stanceResult._estimatedPrice,
          disengagementCount: stanceResult._disengagementCount,
          stagnationCount: stanceResult._stagnationCount,
        });

        // Save based on decision type
        if (stanceResult._decisionType === "out-of-scope") {
          const messageId = await ctx.runMutation(internal.conversations.saveResponse, {
            conversationId: args.conversationId,
            content: responseText,
          });
          traceData.messageId = messageId;
        } else if (stanceResult.closing && stanceResult.verdict) {
          const messageId = await ctx.runMutation(
            internal.conversations.saveResponseWithVerdict,
            {
              conversationId: args.conversationId,
              content: responseText,
              verdict: stanceResult.verdict,
              score: stanceResult.score,
              stance: stanceResult.stance,
              category: stanceResult._category,
              estimatedPrice: stanceResult._estimatedPrice,
              item: stanceResult._item,
              lastAssessment: JSON.stringify(stanceResult._coalescedAssessment),
              disengagementCount: stanceResult._disengagementCount,
              stagnationCount: stanceResult._stagnationCount,
            }
          );
          traceData.messageId = messageId;
        } else {
          const messageId = await ctx.runMutation(
            internal.conversations.saveResponseWithScoring,
            {
              conversationId: args.conversationId,
              content: responseText,
              score: stanceResult.score,
              stance: stanceResult.stance,
              category: stanceResult._category,
              estimatedPrice: stanceResult._estimatedPrice,
              item: stanceResult._item,
              lastAssessment: JSON.stringify(stanceResult._coalescedAssessment),
              disengagementCount: stanceResult._disengagementCount,
              stagnationCount: stanceResult._stagnationCount,
            }
          );
          traceData.messageId = messageId;
        }

        await saveTraceQuietly();
      } else {
        // --- B) No tool call (casual turn) — safety net, should not fire with tool_choice: required ---
        console.warn("LLM skipped tool despite tool_choice: required — falling back to casual path");
        const durationMs = Date.now() - llmStart;
        const responseText = call1.content ?? "";

        traceData.toolCalled = false;

        Object.assign(traceData, {
          durationMs,
          rawResponse: responseText,
          tokenUsage: call1Usage,
          rawScores: "{}",
          sanitizedScores: "{}",
          scoringResult: "{}",
          parsedResponse: JSON.stringify({ response: responseText }),
          decisionType: "casual",
          newStance: currentStance,
          category: conversation.category ?? "other",
          estimatedPrice: conversation.estimatedPrice,
          disengagementCount,
          stagnationCount,
        });

        const messageId = await ctx.runMutation(internal.conversations.saveResponse, {
          conversationId: args.conversationId,
          content: responseText,
        });
        traceData.messageId = messageId;

        await saveTraceQuietly();
      }
    } catch (error) {
      console.error("LLM generation failed:", error);
      if (traceData.rawResponse || traceData.toolCalled !== undefined) {
        Object.assign(traceData, {
          decisionType: "error",
          error: String(error),
          newStance: traceData.previousStance ?? "FIRM",
          rawResponse: traceData.rawResponse ?? "",
          parsedResponse: traceData.parsedResponse ?? "{}",
          sanitizedScores: traceData.sanitizedScores ?? "{}",
          rawScores: traceData.rawScores ?? "{}",
          scoringResult: traceData.scoringResult ?? "{}",
          disengagementCount: traceData.disengagementCount ?? 0,
          stagnationCount: traceData.stagnationCount ?? 0,
          tokenUsage: traceData.tokenUsage ?? { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          durationMs: traceData.durationMs ?? 0,
        });
        await saveTraceQuietly();
      }
      await ctx.runMutation(internal.conversations.setError, {
        conversationId: args.conversationId,
      });
    }
  },
});
