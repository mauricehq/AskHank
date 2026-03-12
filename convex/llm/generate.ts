"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { chatCompletion, type ChatMessage } from "./openrouter";
import { buildSystemPrompt, buildMessages, buildToolDefinition } from "./prompt";
import { extractRecentMoves } from "./moves";

// LLM temperature settings
const TEMPERATURE_ASSESSMENT = 0.8;
const TEMPERATURE_RESPONSE = 0.8;
import {
  computeTurnDelta,
  getStartingScore,
  determineStance,
  applyStanceGuardrails,
  computePriceModifier,
  getPositioningModifier,
  type TurnAssessment,
  type TurnSummary,
  type Stance,
  type ScoringResult,
  type Intent,
  type PricePositioning,
} from "./scoring";

const VALID_STANCES = new Set<string>(["IMMOVABLE", "FIRM", "SKEPTICAL", "RELUCTANT", "CONCEDE"]);

function toStance(value: string | undefined): Stance {
  return value && VALID_STANCES.has(value) ? (value as Stance) : "FIRM";
}

// --- Persisted context shape (stored in lastAssessment) ---

interface PersistedContext {
  item: string;
  estimated_price: number;
  category: string;
  intent: Intent;
  price_positioning: PricePositioning;
  turnSummaries: TurnSummary[];
}

const DEFAULT_PERSISTED: PersistedContext = {
  item: "unknown",
  estimated_price: 0,
  category: "other",
  intent: "want",
  price_positioning: "standard",
  turnSummaries: [],
};

// --- Default assessment for sanitization ---

const DEFAULT_ASSESSMENT: TurnAssessment = {
  item: "unknown",
  intent: "want",
  estimated_price: 0,
  category: "other",
  price_positioning: "standard",
  challenge_addressed: false,
  evidence_provided: false,
  new_angle: true,       // defensive: assume new info
  emotional_reasoning: false,
  challenge_topic: "",
  is_non_answer: false,
  is_out_of_scope: false,
  user_backed_down: false,
  is_directed_question: false,
};

function sanitizeAssessment(raw: Record<string, unknown>): TurnAssessment {
  return {
    item: typeof raw.item === "string" ? raw.item : DEFAULT_ASSESSMENT.item,
    intent: (["want", "need", "replace", "upgrade", "gift"] as const).includes(raw.intent as any)
      ? (raw.intent as Intent)
      : DEFAULT_ASSESSMENT.intent,
    estimated_price: typeof raw.estimated_price === "number" && raw.estimated_price > 0
      ? raw.estimated_price
      : 0,
    category: (["electronics", "cars", "fashion", "furniture", "essentials", "safety_health", "other"] as const).includes(raw.category as any)
      ? (raw.category as string)
      : "other",
    price_positioning: (["budget", "standard", "premium", "luxury"] as const).includes(raw.price_positioning as any)
      ? (raw.price_positioning as PricePositioning)
      : "standard",
    challenge_addressed: raw.challenge_addressed === true,
    evidence_provided: raw.evidence_provided === true,
    new_angle: raw.new_angle !== false,  // default true
    emotional_reasoning: raw.emotional_reasoning === true,
    challenge_topic: typeof raw.challenge_topic === "string" ? raw.challenge_topic : "",
    is_non_answer: raw.is_non_answer === true,
    is_out_of_scope: raw.is_out_of_scope === true,
    user_backed_down: raw.user_backed_down === true,
    is_directed_question: raw.is_directed_question === true,
  };
}

/** Simple context carry-forward. Only carry: item, price, category, intent, positioning. */
function coalesceTurnContext(
  assessment: TurnAssessment,
  prev: PersistedContext | null
): { item: string; estimated_price: number; category: string; intent: Intent; price_positioning: PricePositioning } {
  if (!prev) {
    return {
      item: assessment.item,
      estimated_price: assessment.estimated_price,
      category: assessment.category,
      intent: assessment.intent,
      price_positioning: assessment.price_positioning,
    };
  }

  return {
    item: assessment.item && assessment.item !== "unknown" ? assessment.item : prev.item,
    estimated_price: assessment.estimated_price > 0 ? assessment.estimated_price : prev.estimated_price,
    category: assessment.category && assessment.category !== "other" ? assessment.category : prev.category,
    // Intent: keep from turn 1 unless user explicitly shifts
    intent: assessment.intent !== "want" ? assessment.intent : prev.intent,
    // Positioning: keep previous unless LLM returns non-default
    price_positioning: assessment.price_positioning !== "standard" ? assessment.price_positioning : prev.price_positioning,
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
  _zeroStreak: number;
  _category: string;
  _estimatedPrice?: number;
  _item?: string;
  _decisionType: string;
  _scoringResult: ScoringResult;
  _persistedContext: PersistedContext;
}

interface ConversationState {
  currentStance: Stance;
  disengagementCount: number;
  zeroStreak: number;
  runningScore: number;
  storedItem?: string;
  turnCount: number;
  previousContext?: PersistedContext | null;
}

function executeGetStance(rawAssessmentInput: Record<string, unknown>, state: ConversationState): GetStanceResult {
  const { currentStance, disengagementCount, zeroStreak, runningScore, storedItem, turnCount } = state;

  const assessment = sanitizeAssessment(rawAssessmentInput);
  const coalesced = coalesceTurnContext(assessment, state.previousContext ?? null);
  const estimatedPrice = coalesced.estimated_price > 0 ? coalesced.estimated_price : undefined;
  const category = coalesced.category;
  const item = coalesced.item && coalesced.item !== "unknown" ? coalesced.item : storedItem;

  // Price + positioning modifiers
  const priceModifier = computePriceModifier(estimatedPrice);
  const positioningModifier = getPositioningModifier(coalesced.price_positioning);
  const thresholdMultiplier = priceModifier * positioningModifier;

  // Build persisted context (will be updated with turnSummary below)
  const prevSummaries = state.previousContext?.turnSummaries ?? [];
  // Fallback for early-exit branches that don't modify context
  const unchangedContext: PersistedContext = state.previousContext ?? { ...DEFAULT_PERSISTED, ...coalesced, turnSummaries: [] };

  // Helper to build scoring result
  function makeScoringResult(score: number, delta: number): ScoringResult {
    return { runningScore: score, delta, stance: determineStance(score, thresholdMultiplier), thresholdMultiplier, priceModifier, positioningModifier };
  }

  // 1. Out of scope → no scoring, deflect
  if (assessment.is_out_of_scope) {
    return {
      stance: currentStance,
      score: runningScore,
      guidance: "This is out of scope. Deflect with personality using the OUT OF SCOPE guidelines.",
      _disengagementCount: disengagementCount,
      _zeroStreak: zeroStreak,
      _category: category,
      _estimatedPrice: estimatedPrice,
      _item: item,
      _decisionType: "out-of-scope",
      _scoringResult: makeScoringResult(runningScore, 0),
      _persistedContext: unchangedContext,
    };
  }

  // 2. Previous stance was CONCEDE → approval verdict
  if (currentStance === "CONCEDE") {
    return {
      stance: "CONCEDE",
      score: runningScore,
      guidance: "You already conceded. Give a grudging approval with a final warning about spending.",
      verdict: "approved",
      closing: true,
      _disengagementCount: disengagementCount,
      _zeroStreak: zeroStreak,
      _category: category,
      _estimatedPrice: estimatedPrice,
      _item: item,
      _decisionType: "concede",
      _scoringResult: makeScoringResult(runningScore, 0),
      _persistedContext: unchangedContext,
    };
  }

  // 3. User backed down → denied verdict (Hank wins)
  if (assessment.user_backed_down) {
    const persistedContext: PersistedContext = { ...coalesced, turnSummaries: prevSummaries };
    return {
      stance: currentStance,
      score: runningScore,
      guidance: "Victory. The user backed down. Give a brief, dry, memorable closing line. Don't pile on — they made the right call and you both know it.",
      verdict: "denied",
      closing: true,
      _disengagementCount: 0,
      _zeroStreak: 0,
      _category: category,
      _estimatedPrice: estimatedPrice,
      _item: item,
      _decisionType: "user-backed-down",
      _scoringResult: makeScoringResult(runningScore, 0),
      _persistedContext: persistedContext,
    };
  }

  // 4. Non-answer + count >= 1 → denied verdict
  if (assessment.is_non_answer && disengagementCount >= 1) {
    const nonAnswerScore = runningScore - 5;
    const persistedContext: PersistedContext = { ...coalesced, turnSummaries: prevSummaries };
    return {
      stance: currentStance,
      score: nonAnswerScore,
      guidance: "The user has disengaged. Deliver a memorable closing denial. Make it punchy and final.",
      verdict: "denied",
      closing: true,
      _disengagementCount: disengagementCount + 1,
      _zeroStreak: zeroStreak,
      _category: category,
      _estimatedPrice: estimatedPrice,
      _item: item,
      _decisionType: "disengagement-denied",
      _scoringResult: makeScoringResult(nonAnswerScore, -5),
      _persistedContext: persistedContext,
    };
  }

  // 5. Non-answer (first) → increment counter, warning
  if (assessment.is_non_answer) {
    const nonAnswerScore = runningScore - 5;
    const persistedContext: PersistedContext = { ...coalesced, turnSummaries: prevSummaries };
    return {
      stance: currentStance,
      score: nonAnswerScore,
      guidance: `The user gave a non-answer. Stay at your stance. Push them to make a real argument. Something like "That's not an argument. What's actually wrong with what you have now."`,
      _disengagementCount: 1,
      _zeroStreak: zeroStreak,
      _category: category,
      _estimatedPrice: estimatedPrice,
      _item: item,
      _decisionType: "disengagement-increment",
      _scoringResult: makeScoringResult(nonAnswerScore, -5),
      _persistedContext: persistedContext,
    };
  }

  // 6. Directed question → neutral, no score change, reset disengagement
  if (assessment.is_directed_question) {
    const persistedContext: PersistedContext = { ...coalesced, turnSummaries: prevSummaries };
    return {
      stance: currentStance,
      score: runningScore,
      guidance: "They're asking you to explain yourself. Answer their question directly, then push for something new about their purchase case.",
      _disengagementCount: 0,
      _zeroStreak: zeroStreak,  // preserve — don't increment, don't reset
      _category: category,
      _estimatedPrice: estimatedPrice,
      _item: item,
      _decisionType: "directed-question",
      _scoringResult: makeScoringResult(runningScore, 0),
      _persistedContext: persistedContext,
    };
  }

  // 7. Normal turn — compute delta
  let delta: number;
  if (turnCount === 1) {
    delta = getStartingScore(coalesced.intent);
  } else {
    delta = computeTurnDelta(assessment);
  }

  const newRunningScore = runningScore + delta;

  // 7a. Collapse: score < -5 AND turnCount > 3 → denied
  if (newRunningScore < -5 && turnCount > 3) {
    const newSummary: TurnSummary = { turn: turnCount, delta, topic: assessment.challenge_topic, addressed: assessment.challenge_addressed, evidence: assessment.evidence_provided };
    const persistedContext: PersistedContext = { ...coalesced, turnSummaries: [...prevSummaries, newSummary] };
    return {
      stance: currentStance,
      score: newRunningScore,
      guidance: "The user's case has collapsed. Deliver a final denial. They've been arguing with emotion and no substance.",
      verdict: "denied",
      closing: true,
      _disengagementCount: 0,
      _zeroStreak: 0,
      _category: category,
      _estimatedPrice: estimatedPrice,
      _item: item,
      _decisionType: "collapse-denied",
      _scoringResult: makeScoringResult(newRunningScore, delta),
      _persistedContext: persistedContext,
    };
  }

  // 7b. Stagnation: delta === 0 (turn 1 exempt — no pushback to counter yet)
  const newZeroStreak = delta === 0 && turnCount > 1 ? zeroStreak + 1 : 0;

  if (newZeroStreak >= 3) {
    const newSummary: TurnSummary = { turn: turnCount, delta, topic: assessment.challenge_topic, addressed: assessment.challenge_addressed, evidence: assessment.evidence_provided };
    const persistedContext: PersistedContext = { ...coalesced, turnSummaries: [...prevSummaries, newSummary] };
    return {
      stance: currentStance,
      score: newRunningScore,
      guidance: `The user has stalled — ${newZeroStreak} turns without making progress. Deliver a final denial. "You've had ${newZeroStreak} chances to make your case and haven't moved the needle. We're done."`,
      verdict: "denied",
      closing: true,
      _disengagementCount: 0,
      _zeroStreak: newZeroStreak,
      _category: category,
      _estimatedPrice: estimatedPrice,
      _item: item,
      _decisionType: "stagnation-denied",
      _scoringResult: makeScoringResult(newRunningScore, delta),
      _persistedContext: persistedContext,
    };
  }

  // Stagnation warning (1-2 consecutive zero deltas)
  let stagnationWarning = "";
  if (newZeroStreak === 1) {
    stagnationWarning = " They didn't make progress this turn. Push them harder.";
  } else if (newZeroStreak === 2) {
    stagnationWarning = " Two turns without progress. Warn them: one more weak turn and you're done.";
  }

  // 7c. Determine stance from new score
  const computedStance = determineStance(newRunningScore, thresholdMultiplier);
  const guardrailedStance = applyStanceGuardrails(computedStance, currentStance, turnCount);

  // Build turn summary
  const newSummary: TurnSummary = { turn: turnCount, delta, topic: assessment.challenge_topic, addressed: assessment.challenge_addressed, evidence: assessment.evidence_provided };
  const persistedContext: PersistedContext = { ...coalesced, turnSummaries: [...prevSummaries, newSummary] };

  // Stance guidance
  const stanceGuidance: Record<Stance, string> = {
    IMMOVABLE: "Pure impulse. No valid case whatsoever. Push hard.",
    FIRM: "Weak case. Don't concede unless overwhelming evidence.",
    SKEPTICAL: "Half a case. Acknowledge what's valid, push on what's weak.",
    RELUCTANT: "Strong case but not fully convinced. Push for final proof.",
    CONCEDE: "They've made a genuinely strong case. Concede reluctantly with a final warning.",
  };

  return {
    stance: guardrailedStance,
    score: newRunningScore,
    guidance: stanceGuidance[guardrailedStance] + stagnationWarning,
    verdict: guardrailedStance === "CONCEDE" ? "approved" : undefined,
    closing: guardrailedStance === "CONCEDE" ? true : undefined,
    _disengagementCount: 0,
    _zeroStreak: newZeroStreak,
    _category: category,
    _estimatedPrice: estimatedPrice,
    _item: item,
    _decisionType: computedStance !== guardrailedStance ? "normal (stance capped)" : "normal",
    _scoringResult: makeScoringResult(newRunningScore, delta),
    _persistedContext: persistedContext,
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
      const zeroStreak = conversation.stagnationCount ?? 0;  // repurposed field
      const runningScore = conversation.score ?? 0;
      const turnCount = messages.filter((m) => m.role === "user").length;

      // Parse previous context (v3 shape)
      let previousContext: PersistedContext | null = null;
      if (conversation.lastAssessment) {
        try {
          const parsed = JSON.parse(conversation.lastAssessment);
          previousContext = {
            item: typeof parsed.item === "string" ? parsed.item : "unknown",
            estimated_price: typeof parsed.estimated_price === "number" ? parsed.estimated_price : 0,
            category: typeof parsed.category === "string" ? parsed.category : "other",
            intent: (["want", "need", "replace", "upgrade", "gift"] as const).includes(parsed.intent)
              ? parsed.intent
              : "want",
            price_positioning: (["budget", "standard", "premium", "luxury"] as const).includes(parsed.price_positioning)
              ? parsed.price_positioning
              : "standard",
            turnSummaries: Array.isArray(parsed.turnSummaries) ? parsed.turnSummaries : [],
          };
        } catch {
          previousContext = null;
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

      // 2. Build prompt
      const recentMoves = extractRecentMoves(
        messages.map((m) => ({ role: m.role, content: m.content }))
      );

      const systemPrompt = buildSystemPrompt({
        displayName: displayName ?? undefined,
        stance: currentStance,
        disengagementCount,
        estimatedPrice: previousContext?.estimated_price ?? conversation.estimatedPrice,
        category: previousContext?.category ?? conversation.category,
        zeroStreak,
        turnCount,
        turnSummaries: previousContext?.turnSummaries,
        recentMoves,
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
        temperature: TEMPERATURE_ASSESSMENT,
        maxTokens: 300,
        disengagementCount,
        stagnationCount: zeroStreak,
      });

      // 4. CALL 1: LLM with tool available (low temp for consistent classification)
      const llmStart = Date.now();
      const call1 = await chatCompletion({
        messages: llmMessages,
        modelId,
        temperature: TEMPERATURE_ASSESSMENT,
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
          temperature: TEMPERATURE_ASSESSMENT,
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
      if (toolCall && toolCall.function.name === "get_stance") {
        // --- A) Tool called (scoring turn) ---
        traceData.toolCalled = true;

        // Parse tool arguments defensively
        let rawAssessment: Record<string, unknown>;
        try {
          const raw = JSON.parse(toolCall.function.arguments);
          rawAssessment = typeof raw.assessment === "object" && raw.assessment !== null ? raw.assessment : {};
        } catch {
          rawAssessment = {};
        }
        traceData.toolArguments = JSON.stringify({ assessment: rawAssessment });

        // Execute scoring
        const stanceResult = executeGetStance(rawAssessment, {
          currentStance,
          disengagementCount,
          zeroStreak,
          runningScore,
          storedItem: conversation.item,
          turnCount,
          previousContext,
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

        // CALL 2: LLM generates response using stance guidance (higher temp for voice variety)
        const call2 = await chatCompletion({
          messages: call2Messages,
          modelId,
          temperature: TEMPERATURE_RESPONSE,
          maxTokens: 400,
        });

        const durationMs = Date.now() - llmStart;
        const totalUsage = addUsage(call1Usage, call2.usage);
        const responseText = call2.content;
        if (!responseText) {
          throw new Error("Call 2 returned empty content");
        }

        // Capture trace data
        const sanitizedForTrace = sanitizeAssessment(rawAssessment);

        Object.assign(traceData, {
          durationMs,
          rawResponse: responseText,
          tokenUsage: totalUsage,
          rawScores: JSON.stringify(sanitizedForTrace),
          sanitizedScores: JSON.stringify(stanceResult._persistedContext),
          scoringResult: JSON.stringify(stanceResult._scoringResult),
          parsedResponse: JSON.stringify({ response: responseText, assessment: rawAssessment }),
          decisionType: stanceResult._decisionType,
          newStance: stanceResult.stance,
          category: stanceResult._category,
          estimatedPrice: stanceResult._estimatedPrice,
          disengagementCount: stanceResult._disengagementCount,
          stagnationCount: stanceResult._zeroStreak,
        });

        // Persist context as lastAssessment JSON
        const lastAssessmentJson = JSON.stringify(stanceResult._persistedContext);

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
              lastAssessment: lastAssessmentJson,
              disengagementCount: stanceResult._disengagementCount,
              stagnationCount: stanceResult._zeroStreak,
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
              lastAssessment: lastAssessmentJson,
              disengagementCount: stanceResult._disengagementCount,
              stagnationCount: stanceResult._zeroStreak,
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
          stagnationCount: zeroStreak,
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
