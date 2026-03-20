"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { chatCompletion, type ChatMessage } from "./openrouter";
import {
  buildSystemPrompt,
  buildAssessmentPrompt,
  buildMessages,
  buildConversationMessages,
  buildAssessmentToolDefinition,
  buildOpenerPrompt,
  buildReactionPrompt,
  buildReactionToolDefinition,
  buildCompassBlock,
} from "./prompt";
import { extractRecentMoves } from "./moves";
import { selectMemoryNudges, formatNudgePrompt } from "./memory";
import { computeWorkHours, formatWorkHoursBlock } from "./workHours";

import {
  initCoverageMap,
  updateCoverage,
  computeIntensity,
  assignTerritory,
  computeCoverageRatio,
  computeHankScore,
  buildExaminationProgress,
  INTENSITY_ORDER,
  HANK_SCORE_LABELS,
  type TurnAssessment,
  type TurnSummary,
  type Intensity,
  type Intent,
  type Territory,
  type PersistedContext,
  type CoverageMap,
  type StoredContradiction,
  type CompassResult,
  type ResponseType,
  type EvidenceTier,
  type ArgumentType,
  type ContradictionSeverity,
} from "./compass";

// LLM temperature settings
const TEMPERATURE_ASSESSMENT = 0.8;
const TEMPERATURE_RESPONSE = 0.8;

const VALID_INTENSITIES = new Set<string>(["CURIOUS", "PROBING", "POINTED", "WRAPPING"]);

function toIntensity(value: string | undefined): Intensity {
  return value && VALID_INTENSITIES.has(value) ? (value as Intensity) : "CURIOUS";
}

// --- Persisted context shape (stored in lastAssessment) ---

const DEFAULT_PERSISTED: PersistedContext = {
  item: "unknown",
  estimated_price: 0,
  category: "other",
  intent: "want",
  coverageMap: initCoverageMap("want"),
  turnSummaries: [],
  contradictions: [],
  consecutiveNonAnswers: 0,
  consecutiveLowEngagement: 0,
  turnsSinceCoverageAdvanced: 0,
  territoryAssignmentCounts: {},
  lastAssignedTerritory: null,
};

// --- Default assessment for sanitization ---

const DEFAULT_ASSESSMENT: TurnAssessment = {
  item: "unknown",
  intent: "want",
  estimated_price: 0,
  category: "other",
  hanks_question: "",
  territory_addressed: "other",
  response_type: "none",
  evidence_tier: "none",
  argument_type: "new_other",
  emotional_reasoning: false,
  contradiction: null,
  is_non_answer: false,
  is_out_of_scope: false,
  is_directed_question: false,
  challenge_topic: "",
};

const FALLBACK_ASSESSMENT: Record<string, unknown> = { response_type: "none" };

const VALID_RESPONSE_TYPES = new Set(["direct_counter", "partial", "pivot", "dodge", "none"]);
const VALID_EVIDENCE_TIERS = new Set(["none", "assertion", "anecdotal", "specific", "concrete"]);
const VALID_ARGUMENT_TYPES = new Set(["same_as_before", "new_usage", "new_deficiency", "new_financial", "new_comparison", "new_other"]);
const VALID_TERRITORIES = new Set(["trigger", "current_solution", "usage_reality", "real_cost", "pattern", "alternatives", "emotional_check", "other"]);
const VALID_INTENTS = new Set(["want", "need", "replace", "upgrade", "gift"]);
const VALID_CATEGORIES = new Set(["electronics", "vehicles", "fashion", "furniture", "kitchen", "travel", "entertainment", "sports_fitness", "beauty", "subscriptions", "hardware", "essentials", "safety_health", "other"]);
const VALID_CONTRADICTION_SEVERITIES = new Set(["refinement", "soft", "hard"]);

/** Parse lastAssessment JSON into a typed PersistedContext, or null on failure. */
function parsePersistedContext(json: string): PersistedContext | null {
  try {
    const parsed = JSON.parse(json);
    return {
      item: typeof parsed.item === "string" ? parsed.item : "unknown",
      estimated_price: typeof parsed.estimated_price === "number" ? parsed.estimated_price : 0,
      category: typeof parsed.category === "string" ? parsed.category : "other",
      intent: VALID_INTENTS.has(parsed.intent) ? parsed.intent : "want",
      coverageMap: parsed.coverageMap ?? initCoverageMap(parsed.intent ?? "want"),
      turnSummaries: Array.isArray(parsed.turnSummaries) ? parsed.turnSummaries : [],
      contradictions: Array.isArray(parsed.contradictions) ? parsed.contradictions : [],
      consecutiveNonAnswers: typeof parsed.consecutiveNonAnswers === "number" ? parsed.consecutiveNonAnswers : 0,
      consecutiveLowEngagement: typeof parsed.consecutiveLowEngagement === "number" ? parsed.consecutiveLowEngagement : 0,
      turnsSinceCoverageAdvanced: typeof parsed.turnsSinceCoverageAdvanced === "number" ? parsed.turnsSinceCoverageAdvanced : 0,
      territoryAssignmentCounts: parsed.territoryAssignmentCounts ?? {},
      lastAssignedTerritory: parsed.lastAssignedTerritory ?? null,
      memoryNudgeText: typeof parsed.memoryNudgeText === "string" ? parsed.memoryNudgeText : undefined,
      memoryNudges: Array.isArray(parsed.memoryNudges) ? parsed.memoryNudges : undefined,
    };
  } catch {
    return null;
  }
}

function sanitizeAssessment(raw: Record<string, unknown>): TurnAssessment {
  // Parse contradiction
  let contradiction: TurnAssessment["contradiction"] = null;
  if (raw.contradiction && typeof raw.contradiction === "object") {
    const c = raw.contradiction as Record<string, unknown>;
    if (
      typeof c.territory === "string" &&
      VALID_TERRITORIES.has(c.territory) &&
      c.territory !== "other" &&
      typeof c.severity === "string" &&
      VALID_CONTRADICTION_SEVERITIES.has(c.severity)
    ) {
      contradiction = {
        territory: c.territory as Territory,
        prior_claim: typeof c.prior_claim === "string" ? c.prior_claim : "",
        current_claim: typeof c.current_claim === "string" ? c.current_claim : "",
        reasoning: typeof c.reasoning === "string" ? c.reasoning : "",
        severity: c.severity as ContradictionSeverity,
      };
    }
  }

  return {
    item: typeof raw.item === "string" ? raw.item : DEFAULT_ASSESSMENT.item,
    intent: VALID_INTENTS.has(raw.intent as string)
      ? (raw.intent as Intent)
      : DEFAULT_ASSESSMENT.intent,
    estimated_price:
      typeof raw.estimated_price === "number" && raw.estimated_price > 0
        ? raw.estimated_price
        : 0,
    category: VALID_CATEGORIES.has(raw.category as string)
      ? (raw.category as string)
      : "other",
    hanks_question: typeof raw.hanks_question === "string" ? raw.hanks_question : "",
    territory_addressed: VALID_TERRITORIES.has(raw.territory_addressed as string)
      ? (raw.territory_addressed as Territory | "other")
      : "other",
    response_type: VALID_RESPONSE_TYPES.has(raw.response_type as string)
      ? (raw.response_type as ResponseType)
      : "none",
    evidence_tier: VALID_EVIDENCE_TIERS.has(raw.evidence_tier as string)
      ? (raw.evidence_tier as EvidenceTier)
      : "none",
    argument_type: VALID_ARGUMENT_TYPES.has(raw.argument_type as string)
      ? (raw.argument_type as ArgumentType)
      : "new_other",
    emotional_reasoning: raw.emotional_reasoning === true,
    contradiction,
    is_non_answer: raw.is_non_answer === true,
    is_out_of_scope: raw.is_out_of_scope === true,
    is_directed_question: raw.is_directed_question === true,
    challenge_topic: typeof raw.challenge_topic === "string" ? raw.challenge_topic : "",
  };
}

/** Simple context carry-forward. Only carry: item, price, category, intent. */
function coalesceTurnContext(
  assessment: TurnAssessment,
  prev: PersistedContext | null
): { item: string; estimated_price: number; category: string; intent: Intent } {
  if (!prev) {
    return {
      item: assessment.item,
      estimated_price: assessment.estimated_price,
      category: assessment.category,
      intent: assessment.intent,
    };
  }

  return {
    item: assessment.item && assessment.item !== "unknown" ? assessment.item : prev.item,
    estimated_price: assessment.estimated_price > 0 ? assessment.estimated_price : prev.estimated_price,
    category: assessment.category && assessment.category !== "other" ? assessment.category : prev.category,
    intent: assessment.intent !== "want" || prev.intent === "want"
      ? assessment.intent
      : prev.intent,
  };
}

// --- Compass state ---

interface CompassState {
  currentIntensity: Intensity;
  turnCount: number;
  previousContext: PersistedContext | null;
}

// --- Compass result (internal, returned by executeCompass) ---

interface CompassResultInternal {
  intensity: Intensity;
  coverageRatio: number;
  nextTerritory: Territory | null;
  territoryExhausted?: Territory;
  turnsSinceCoverageAdvanced: number;
  decisionType: string;
  closing?: boolean;
  decision?: "buying" | "skipping";
  hankScore?: number;
  hankScoreLabel?: string;
  coverageSummary?: string;
  // Internal fields
  _consecutiveNonAnswers: number;
  _category: string;
  _estimatedPrice?: number;
  _item?: string;
  _persistedContext: PersistedContext;
}

function executeCompass(
  rawAssessmentInput: Record<string, unknown>,
  state: CompassState
): CompassResultInternal {
  const { currentIntensity, turnCount } = state;
  const assessment = sanitizeAssessment(rawAssessmentInput);
  const coalesced = coalesceTurnContext(assessment, state.previousContext ?? null);
  const estimatedPrice = coalesced.estimated_price > 0 ? coalesced.estimated_price : undefined;
  const category = coalesced.category;
  const item = coalesced.item && coalesced.item !== "unknown" ? coalesced.item : state.previousContext?.item;

  // Load persisted context or init fresh
  const prev = state.previousContext ?? { ...DEFAULT_PERSISTED };
  const prevCoverageMap = turnCount === 1 ? initCoverageMap(coalesced.intent) : prev.coverageMap;
  const prevContradictions = prev.contradictions ?? [];
  const prevSummaries = prev.turnSummaries ?? [];
  const prevNonAnswers = prev.consecutiveNonAnswers ?? 0;
  const prevLowEngagement = prev.consecutiveLowEngagement ?? 0;
  const prevStagnation = prev.turnsSinceCoverageAdvanced ?? 0;
  const prevAssignmentCounts = prev.territoryAssignmentCounts ?? {};
  const lastAssigned = prev.lastAssignedTerritory ?? null;

  // Sticky flags
  const stickyFlags = {
    ...(prev.memoryNudgeText ? { memoryNudgeText: prev.memoryNudgeText } : {}),
    ...(prev.memoryNudges ? { memoryNudges: prev.memoryNudges } : {}),
  };

  // Helper to build unchanged context
  function makeContext(overrides: Partial<PersistedContext> = {}): PersistedContext {
    return {
      ...coalesced,
      coverageMap: prevCoverageMap,
      turnSummaries: prevSummaries,
      contradictions: prevContradictions,
      consecutiveNonAnswers: prevNonAnswers,
      consecutiveLowEngagement: prevLowEngagement,
      turnsSinceCoverageAdvanced: prevStagnation,
      territoryAssignmentCounts: prevAssignmentCounts,
      lastAssignedTerritory: lastAssigned,
      ...stickyFlags,
      ...overrides,
    };
  }

  // 1. Out of scope → no coverage update
  if (assessment.is_out_of_scope) {
    return {
      intensity: currentIntensity,
      coverageRatio: computeCoverageRatio(prevCoverageMap),
      nextTerritory: null,
      turnsSinceCoverageAdvanced: prevStagnation,
      decisionType: "out-of-scope",
      _consecutiveNonAnswers: prevNonAnswers,
      _category: category,
      _estimatedPrice: estimatedPrice,
      _item: item,
      _persistedContext: makeContext(),
    };
  }

  // 2. Directed question → no coverage update
  if (assessment.is_directed_question) {
    return {
      intensity: currentIntensity,
      coverageRatio: computeCoverageRatio(prevCoverageMap),
      nextTerritory: lastAssigned, // keep same territory assignment
      turnsSinceCoverageAdvanced: prevStagnation,
      decisionType: "directed-question",
      _consecutiveNonAnswers: 0, // reset on engagement
      _category: category,
      _estimatedPrice: estimatedPrice,
      _item: item,
      _persistedContext: makeContext({
        consecutiveNonAnswers: 0,
        lastAssignedTerritory: lastAssigned,
      }),
    };
  }

  // 3. Non-answer → increment counters, no auto-close
  if (assessment.is_non_answer) {
    const newNonAnswers = prevNonAnswers + 1;
    const newLowEngagement = prevLowEngagement + 1;
    const decisionType = newNonAnswers === 1 ? "non-answer-warning" : "non-answer-disengaged";

    return {
      intensity: currentIntensity,
      coverageRatio: computeCoverageRatio(prevCoverageMap),
      nextTerritory: lastAssigned,
      turnsSinceCoverageAdvanced: prevStagnation + 1,
      decisionType,
      _consecutiveNonAnswers: newNonAnswers,
      _category: category,
      _estimatedPrice: estimatedPrice,
      _item: item,
      _persistedContext: makeContext({
        consecutiveNonAnswers: newNonAnswers,
        consecutiveLowEngagement: newLowEngagement,
        turnsSinceCoverageAdvanced: prevStagnation + 1,
      }),
    };
  }

  // 4. Normal turn → update coverage, compute intensity, assign territory

  // Update coverage map
  const newCoverageMap = updateCoverage(prevCoverageMap, assessment, lastAssigned, turnCount);

  // Check if coverage actually advanced
  const prevRatio = computeCoverageRatio(prevCoverageMap);
  const newRatio = computeCoverageRatio(newCoverageMap);
  // Also check if any territory depth changed
  let coverageAdvanced = newRatio > prevRatio;
  if (!coverageAdvanced && assessment.territory_addressed !== "other") {
    const t = assessment.territory_addressed as Territory;
    if (newCoverageMap[t] && prevCoverageMap[t]) {
      coverageAdvanced =
        newCoverageMap[t].depth !== prevCoverageMap[t].depth ||
        newCoverageMap[t].bestEvidence !== prevCoverageMap[t].bestEvidence;
    }
  }

  const newStagnation = coverageAdvanced ? 0 : prevStagnation + 1;

  // Handle contradictions
  const newContradictions = [...prevContradictions];
  if (
    assessment.contradiction &&
    assessment.contradiction.severity !== "refinement"
  ) {
    newContradictions.push({
      territory: assessment.contradiction.territory,
      turnDetected: turnCount,
      priorClaim: assessment.contradiction.prior_claim,
      currentClaim: assessment.contradiction.current_claim,
      severity: assessment.contradiction.severity as "soft" | "hard",
      resolved: false,
    });
  }

  // Resolve contradictions addressed this turn
  if (
    assessment.territory_addressed !== "other" &&
    assessment.response_type === "direct_counter" &&
    (assessment.evidence_tier === "specific" || assessment.evidence_tier === "concrete")
  ) {
    for (let i = 0; i < newContradictions.length; i++) {
      const c = newContradictions[i];
      if (!c.resolved && c.territory === assessment.territory_addressed) {
        newContradictions[i] = { ...c, resolved: true, turnResolved: turnCount };
      }
    }
  }

  // Determine engagement quality
  const isLowEngagement =
    assessment.response_type === "pivot" ||
    assessment.response_type === "dodge" ||
    assessment.response_type === "none";
  const newLowEngagement = isLowEngagement ? prevLowEngagement + 1 : 0;

  // Compute intensity
  const newIntensity = computeIntensity(
    turnCount,
    newRatio,
    newLowEngagement,
    currentIntensity
  );

  // Assign territory
  const newAssignmentCounts = { ...prevAssignmentCounts };
  const nextTerritory = assignTerritory(
    newCoverageMap,
    coalesced.intent,
    newContradictions,
    newAssignmentCounts,
    prev.memoryNudges
  );

  // Track territory exhaustion
  let territoryExhausted: Territory | undefined;
  if (nextTerritory) {
    newAssignmentCounts[nextTerritory] = (newAssignmentCounts[nextTerritory] ?? 0) + 1;
  }
  // Check if any territory just hit exhaustion
  if (lastAssigned && newCoverageMap[lastAssigned]?.depth === "touched") {
    const count = newAssignmentCounts[lastAssigned] ?? 0;
    if (count >= 3) {
      territoryExhausted = lastAssigned;
    }
  }

  // Build turn summary
  const newSummary: TurnSummary = {
    turn: turnCount,
    territoryTargeted: lastAssigned,
    territoryAddressed: assessment.territory_addressed,
    responseType: assessment.response_type,
    evidenceTier: assessment.evidence_tier,
    argumentType: assessment.argument_type,
    emotionalReasoning: assessment.emotional_reasoning,
    contradictionDetected: assessment.contradiction?.severity,
    topic: assessment.challenge_topic,
  };

  // Stagnation-based decision type
  let decisionType = "normal";
  if (newStagnation >= 4) {
    decisionType = "stagnation-disengaged";
  } else if (newStagnation >= 3) {
    decisionType = "stagnation-warning";
  }

  const persistedContext: PersistedContext = {
    ...coalesced,
    coverageMap: newCoverageMap,
    turnSummaries: [...prevSummaries, newSummary],
    contradictions: newContradictions,
    consecutiveNonAnswers: 0, // reset on substantive message
    consecutiveLowEngagement: newLowEngagement,
    turnsSinceCoverageAdvanced: newStagnation,
    territoryAssignmentCounts: newAssignmentCounts,
    lastAssignedTerritory: nextTerritory,
    ...stickyFlags,
  };

  return {
    intensity: newIntensity,
    coverageRatio: newRatio,
    nextTerritory,
    territoryExhausted,
    turnsSinceCoverageAdvanced: newStagnation,
    decisionType,
    _consecutiveNonAnswers: 0,
    _category: category,
    _estimatedPrice: estimatedPrice,
    _item: item,
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
  previousIntensity: string;
  newIntensity: string;
  decisionType: string;
  category: string;
  estimatedPrice: number;
  consecutiveNonAnswers: number;
  turnsSinceCoverageAdvanced: number;
  tokenUsage: { promptTokens: number; completionTokens: number; totalTokens: number };
  durationMs: number;
  error: string;
  call2SystemPrompt: string;
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

/** Extract reaction_text from a Call 2 closing_reaction tool call result. */
function extractReactionText(result: {
  content: string | null;
  toolCalls: { function: { name: string; arguments: string } }[] | null;
}): string {
  if (result.toolCalls?.[0]?.function.name === "closing_reaction") {
    try {
      const parsed = JSON.parse(result.toolCalls[0].function.arguments);
      if (typeof parsed.reaction_text === "string" && parsed.reaction_text) {
        return parsed.reaction_text;
      }
    } catch {
      /* bad JSON — fall through */
    }
  }
  return result.content ?? "";
}

export const generateReaction = internalAction({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    decision: v.union(v.literal("buying"), v.literal("skipping")),
  },
  handler: async (ctx, args) => {
    const primaryModel = (await ctx.runQuery(
      internal.conversations.internalGetSetting,
      { key: "hank_model" }
    )) as string;

    try {
      // 1. Load conversation + messages + persisted context
      const conversation = await ctx.runQuery(
        internal.conversations.internalGetConversation,
        { conversationId: args.conversationId }
      );
      if (!conversation) throw new Error("Conversation not found");

      const messages = await ctx.runQuery(
        internal.conversations.internalGetMessages,
        { conversationId: args.conversationId }
      );

      const userInfo = await ctx.runQuery(
        internal.conversations.internalGetUserInfo,
        { userId: args.userId }
      );

      // 2. Parse persisted context
      const previousContext = conversation.lastAssessment
        ? parsePersistedContext(conversation.lastAssessment)
        : null;

      // 3. Compute Hank Score
      const coverageMap = previousContext?.coverageMap ?? initCoverageMap("want");
      const turnSummaries = previousContext?.turnSummaries ?? [];
      const hankScoreResult = computeHankScore(coverageMap, turnSummaries);

      // 4. Build reaction prompt
      const item = previousContext?.item ?? conversation.item;
      const estimatedPrice = previousContext?.estimated_price ?? conversation.estimatedPrice;
      const category = previousContext?.category ?? conversation.category ?? "other";
      const coverageSummary = buildExaminationProgress(coverageMap);

      const reactionPrompt = buildReactionPrompt({
        displayName: userInfo.displayName ?? undefined,
        estimatedPrice,
        category,
        item,
        decision: args.decision,
        hankScore: hankScoreResult.score,
        coverageSummary,
      });

      // 5. Build messages for LLM
      const conversationMsgs = buildConversationMessages(
        messages.map((m) => ({ role: m.role, content: m.content }))
      );
      const llmMessages: ChatMessage[] = [
        { role: "system", content: reactionPrompt },
        ...conversationMsgs,
      ];

      // 6. LLM call with closing_reaction tool
      const closingTool = buildReactionToolDefinition();
      const llmStart = Date.now();
      const result = await chatCompletion({
        messages: llmMessages,
        modelId: primaryModel,
        temperature: TEMPERATURE_RESPONSE,
        maxTokens: 400,
        tools: [closingTool],
        tool_choice: { type: "function", function: { name: "closing_reaction" } },
      });

      let responseText = extractReactionText(result);
      let totalUsage = result.usage;

      // Retry once if empty
      if (!responseText) {
        console.warn("generateReaction: reaction_text empty — retrying");
        const retry = await chatCompletion({
          messages: llmMessages,
          modelId: primaryModel,
          temperature: TEMPERATURE_RESPONSE,
          maxTokens: 400,
          tools: [closingTool],
          tool_choice: { type: "function", function: { name: "closing_reaction" } },
        });
        responseText = extractReactionText(retry);
        totalUsage = addUsage(totalUsage, retry.usage);
      }

      // Hardcoded fallback
      if (!responseText) {
        responseText = args.decision === "buying" ? "Go buy it." : "Good call.";
      }

      const currentIntensity = toIntensity(conversation.intensity);
      const coverageRatio = computeCoverageRatio(coverageMap);
      const durationMs = Date.now() - llmStart;

      // 7. Save via saveResponseWithDecision
      const messageId = await ctx.runMutation(
        internal.conversations.saveResponseWithDecision,
        {
          conversationId: args.conversationId,
          content: responseText,
          decision: args.decision,
          intensity: currentIntensity,
          coverageRatio,
          category,
          estimatedPrice,
          item,
          lastAssessment: conversation.lastAssessment,
          consecutiveNonAnswers: conversation.consecutiveNonAnswers ?? 0,
          reactionText: responseText,
          hankScore: hankScoreResult.score,
        }
      );

      // 8. Save LLM trace for debugging
      try {
        await ctx.runMutation(internal.llmTraces.saveTrace, {
          conversationId: args.conversationId,
          messageId,
          systemPrompt: reactionPrompt,
          messagesArray: JSON.stringify(llmMessages),
          modelId: primaryModel,
          temperature: TEMPERATURE_RESPONSE,
          maxTokens: 400,
          rawResponse: responseText,
          parsedResponse: JSON.stringify({ reactionText: responseText }),
          rawScores: "{}",
          sanitizedScores: conversation.lastAssessment ?? "{}",
          scoringResult: JSON.stringify({
            hankScore: hankScoreResult.score,
            hankScoreLabel: hankScoreResult.label,
            coverageRatio,
          }),
          previousIntensity: currentIntensity,
          newIntensity: currentIntensity,
          decisionType: `user-resolve-${args.decision}`,
          category,
          estimatedPrice,
          consecutiveNonAnswers: conversation.consecutiveNonAnswers ?? 0,
          turnsSinceCoverageAdvanced: 0,
          tokenUsage: totalUsage,
          durationMs,
          toolCalled: true,
          toolArguments: JSON.stringify({ decision: args.decision }),
          toolResult: JSON.stringify({ reactionText: responseText }),
        });
      } catch (traceError) {
        console.error("generateReaction: trace save failed (non-fatal):", traceError);
      }
    } catch (error) {
      console.error("generateReaction failed:", error);
      await ctx.runMutation(internal.conversations.setError, {
        conversationId: args.conversationId,
      });
    }
  },
});

export const respond = internalAction({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const primaryModel = (await ctx.runQuery(
      internal.conversations.internalGetSetting,
      { key: "hank_model" }
    )) as string;
    const fallbackModel = (await ctx.runQuery(
      internal.conversations.internalGetSetting,
      { key: "hank_fallback_model" }
    )) as string | null;

    async function executeRespond(modelId: string) {
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

        const currentIntensity = toIntensity(conversation.intensity);
        const turnCount = messages.filter((m) => m.role === "user").length;

        // Sliding context window: for turns 9+, keep first user message + last 6 messages
        let windowedMessages = messages;
        if (turnCount >= 9 && messages.length > 7) {
          const firstUserMsg = messages.find((m) => m.role === "user");
          const tail = messages.slice(-6);
          if (firstUserMsg && !tail.some((m) => m._id === firstUserMsg._id)) {
            windowedMessages = [firstUserMsg, ...tail];
          } else {
            windowedMessages = tail;
          }
        }

        // Parse previous context (v2 shape)
        const previousContext = conversation.lastAssessment
          ? parsePersistedContext(conversation.lastAssessment)
          : null;

        const userInfo = await ctx.runQuery(
          internal.conversations.internalGetUserInfo,
          { userId: args.userId }
        );
        const displayName = userInfo.displayName;
        const userTimezone = userInfo.timezone ?? undefined;
        const userIncomeAmount = userInfo.incomeAmount ?? undefined;
        const userIncomeType = (userInfo.incomeType ?? undefined) as "hourly" | "annual" | undefined;

        // Fetch past conversations (needed for memory nudge)
        const pastConversations = await ctx.runQuery(
          internal.conversations.internalGetPastConversations,
          { userId: args.userId, excludeConversationId: args.conversationId }
        );

        // 2. Build prompt
        const recentMoves = extractRecentMoves(
          messages.map((m) => ({ role: m.role, content: m.content }))
        );

        // Work hours: compute from persisted price + user income
        const priceForWorkHours = previousContext?.estimated_price ?? conversation.estimatedPrice;
        const workHoursBlock = formatWorkHoursBlock(
          computeWorkHours(priceForWorkHours, userIncomeAmount, userIncomeType)
        );

        // Extract previous context fields for assessment prompt
        const lastChallengeTopic = previousContext?.turnSummaries?.length
          ? previousContext.turnSummaries[previousContext.turnSummaries.length - 1].topic
          : undefined;

        // Call 1: assessment-only prompt
        const assessmentPrompt = buildAssessmentPrompt({
          intensity: currentIntensity,
          consecutiveNonAnswers: previousContext?.consecutiveNonAnswers ?? conversation.consecutiveNonAnswers ?? 0,
          estimatedPrice: previousContext?.estimated_price ?? conversation.estimatedPrice,
          category: previousContext?.category ?? conversation.category,
          turnCount,
          turnSummaries: previousContext?.turnSummaries,
          previousItem: previousContext?.item,
          previousIntent: previousContext?.intent,
          lastChallengeTopic: lastChallengeTopic || undefined,
          coverageMap: previousContext?.coverageMap,
          lastAssignedTerritory: previousContext?.lastAssignedTerritory,
        });

        const llmMessages = buildMessages(
          assessmentPrompt,
          windowedMessages.map((m) => ({ role: m.role, content: m.content }))
        );

        // 3. Build tool definition
        const toolDef = buildAssessmentToolDefinition();

        // Capture input context for trace
        Object.assign(traceData, {
          previousIntensity: currentIntensity,
          systemPrompt: assessmentPrompt,
          messagesArray: JSON.stringify(llmMessages),
          modelId,
          temperature: TEMPERATURE_ASSESSMENT,
          maxTokens: 500,
          consecutiveNonAnswers: previousContext?.consecutiveNonAnswers ?? 0,
          turnsSinceCoverageAdvanced: previousContext?.turnsSinceCoverageAdvanced ?? 0,
        });

        // 4. CALL 1: LLM with tool available
        const llmStart = Date.now();
        const call1 = await chatCompletion({
          messages: llmMessages,
          modelId,
          temperature: TEMPERATURE_ASSESSMENT,
          maxTokens: 500,
          tools: [toolDef],
          tool_choice: { type: "function", function: { name: "assess_turn" } },
        });

        let toolCall = call1.toolCalls?.[0];
        let call1Usage = call1.usage;

        // Retry once if tool call missing
        if (!toolCall || toolCall.function.name !== "assess_turn") {
          console.warn("LLM skipped tool — retrying (attempt 2)");
          const retry = await chatCompletion({
            messages: llmMessages,
            modelId,
            temperature: TEMPERATURE_ASSESSMENT,
            maxTokens: 500,
            tools: [toolDef],
            tool_choice: { type: "function", function: { name: "assess_turn" } },
          });
          call1Usage = addUsage(call1.usage, retry.usage);
          const retryToolCall = retry.toolCalls?.[0];
          if (retryToolCall && retryToolCall.function.name === "assess_turn") {
            toolCall = retryToolCall;
          }
        }

        // 5. Extract assessment
        let rawAssessment: Record<string, unknown>;

        if (toolCall && toolCall.function.name === "assess_turn") {
          traceData.toolCalled = true;
          try {
            const raw = JSON.parse(toolCall.function.arguments);
            rawAssessment = typeof raw.assessment === "object" && raw.assessment !== null ? raw.assessment : {};
          } catch {
            rawAssessment = {};
          }
          traceData.toolArguments = JSON.stringify({ assessment: rawAssessment });
        } else {
          console.warn("LLM skipped tool call — using fallback assessment");
          rawAssessment = FALLBACK_ASSESSMENT;
          traceData.toolCalled = false;
        }

        // Execute compass
        const compassResult = executeCompass(rawAssessment, {
          currentIntensity,
          turnCount,
          previousContext,
        });

        // Sanitize assessment for trace
        const sanitizedAssessment = sanitizeAssessment(rawAssessment);

        const toolResultStr = JSON.stringify({
          intensity: compassResult.intensity,
          coverageRatio: compassResult.coverageRatio,
          nextTerritory: compassResult.nextTerritory,
          decisionType: compassResult.decisionType,
          ...(compassResult.closing ? { closing: true, decision: compassResult.decision } : {}),
        });
        traceData.toolResult = toolResultStr;

        // Select memory nudges on turn 1+ (up to 3)
        // v2: fetch on turn 1 (not turn 2) to arm territory assignment
        let memoryNudgeConversationIds: Id<"conversations">[] = [];

        if (!compassResult.closing) {
          const existingNudges = compassResult._persistedContext.memoryNudges;
          if (!existingNudges || existingNudges.length === 0) {
            // First time: select nudges
            const nudges = selectMemoryNudges(pastConversations as any, compassResult._category, userTimezone);
            if (nudges.length > 0) {
              compassResult._persistedContext.memoryNudges = nudges;
              memoryNudgeConversationIds = nudges.map((n) => n.conversationId as Id<"conversations">);
              compassResult._persistedContext.memoryNudgeText = formatNudgePrompt(nudges, compassResult.nextTerritory);
            }
          } else {
            // Re-format if territory changed
            const lastTerritory = compassResult._persistedContext.lastAssignedTerritory;
            if (compassResult.nextTerritory !== lastTerritory) {
              compassResult._persistedContext.memoryNudgeText = formatNudgePrompt(existingNudges, compassResult.nextTerritory);
            }
          }
        }

        // Build Call 2 prompt
        const nudgeText = compassResult._persistedContext.memoryNudgeText ?? null;

        let call2SystemPrompt: string;
        if (compassResult.closing && compassResult.decision) {
          // Auto-resolve: use reaction prompt
          call2SystemPrompt = buildReactionPrompt({
            displayName: displayName ?? undefined,
            estimatedPrice: compassResult._estimatedPrice,
            category: compassResult._category,
            item: compassResult._item,
            decision: compassResult.decision,
            hankScore: compassResult.hankScore!,
            coverageSummary: compassResult.coverageSummary!,
          });
        } else if (turnCount === 1 && compassResult.decisionType === "normal") {
          // Opener
          const openerWorkHoursBlock = formatWorkHoursBlock(
            computeWorkHours(compassResult._estimatedPrice, userIncomeAmount, userIncomeType)
          );
          call2SystemPrompt = buildOpenerPrompt({
            displayName: displayName ?? undefined,
            estimatedPrice: compassResult._estimatedPrice,
            category: compassResult._category,
            workHoursBlock: openerWorkHoursBlock,
            nextTerritory: compassResult.nextTerritory,
          });
        } else {
          // Normal turn: system prompt + compass block
          // Recompute work hours with current-turn price
          let call2Base: string;
          if (compassResult._estimatedPrice && compassResult._estimatedPrice !== priceForWorkHours) {
            const updatedWorkHoursBlock = formatWorkHoursBlock(
              computeWorkHours(compassResult._estimatedPrice, userIncomeAmount, userIncomeType)
            );
            call2Base = buildSystemPrompt({
              displayName: displayName ?? undefined,
              intensity: compassResult.intensity,
              consecutiveNonAnswers: compassResult._consecutiveNonAnswers,
              estimatedPrice: compassResult._estimatedPrice,
              category: compassResult._category,
              turnCount,
              turnSummaries: compassResult._persistedContext.turnSummaries,
              recentMoves,
              workHoursBlock: updatedWorkHoursBlock,
              coverageMap: compassResult._persistedContext.coverageMap,
            });
          } else {
            call2Base = buildSystemPrompt({
              displayName: displayName ?? undefined,
              intensity: compassResult.intensity,
              consecutiveNonAnswers: compassResult._consecutiveNonAnswers,
              estimatedPrice: previousContext?.estimated_price ?? conversation.estimatedPrice,
              category: previousContext?.category ?? conversation.category,
              turnCount,
              turnSummaries: compassResult._persistedContext.turnSummaries,
              recentMoves,
              workHoursBlock,
              coverageMap: compassResult._persistedContext.coverageMap,
            });
          }

          // Append memory nudge if available
          if (nudgeText) {
            call2Base += "\n\n" + nudgeText;
          }

          // Append compass block
          const compassBlock = buildCompassBlock(
            compassResult.intensity,
            compassResult.nextTerritory,
            compassResult._persistedContext.coverageMap,
            compassResult.turnsSinceCoverageAdvanced,
            compassResult.territoryExhausted,
            compassResult._persistedContext.contradictions,
          );
          call2SystemPrompt = call2Base + "\n\n" + compassBlock;
        }

        traceData.call2SystemPrompt = call2SystemPrompt;

        // Build messages for Call 2
        const conversationMsgs = buildConversationMessages(
          windowedMessages.map((m) => ({ role: m.role, content: m.content }))
        );
        const call2Messages: ChatMessage[] = [
          { role: "system", content: call2SystemPrompt },
          ...conversationMsgs,
        ];

        // CALL 2: Generate response
        const isClosingTurn = !!(compassResult.closing && compassResult.decision);
        const closingTool = isClosingTurn ? buildReactionToolDefinition() : undefined;

        const call2Params = {
          messages: call2Messages,
          modelId,
          temperature: TEMPERATURE_RESPONSE,
          maxTokens: 400,
          ...(closingTool
            ? {
                tools: [closingTool],
                tool_choice: { type: "function" as const, function: { name: "closing_reaction" } },
              }
            : {}),
        };

        const call2 = await chatCompletion(call2Params);

        let totalUsage = addUsage(call1Usage, call2.usage);
        let durationMs = Date.now() - llmStart;

        let responseText: string;

        if (isClosingTurn) {
          responseText = extractReactionText(call2);

          // Retry once if empty
          if (!responseText) {
            console.warn("Call 2 reaction_text empty — retrying (attempt 2)");
            const retry = await chatCompletion(call2Params);
            totalUsage = addUsage(totalUsage, retry.usage);
            durationMs = Date.now() - llmStart;
            responseText = extractReactionText(retry);
          }

          // Hardcoded fallback
          if (!responseText) {
            console.warn("Call 2 reaction_text still empty after retry — using fallback");
            responseText = compassResult.decision === "buying"
              ? "Go buy it."
              : "Good call.";
          }
        } else {
          responseText = call2.content ?? "";
          if (!responseText) {
            // Retry once (matches closing path pattern)
            const call2Retry = await chatCompletion(call2Params);
            totalUsage = addUsage(totalUsage, call2Retry.usage);
            durationMs = Date.now() - llmStart;
            responseText = call2Retry.content ?? "";
            if (!responseText) {
              throw new Error("Call 2 returned empty content");
            }
          }
        }

        // Capture trace data
        Object.assign(traceData, {
          durationMs,
          rawResponse: responseText,
          tokenUsage: totalUsage,
          rawScores: JSON.stringify(sanitizedAssessment),
          sanitizedScores: JSON.stringify(compassResult._persistedContext),
          scoringResult: JSON.stringify({
            coverageRatio: compassResult.coverageRatio,
            intensity: compassResult.intensity,
            nextTerritory: compassResult.nextTerritory,
            turnsSinceCoverageAdvanced: compassResult.turnsSinceCoverageAdvanced,
          }),
          parsedResponse: JSON.stringify({ response: responseText, assessment: rawAssessment }),
          decisionType: compassResult.decisionType + (traceData.toolCalled === false ? " (fallback)" : ""),
          newIntensity: compassResult.intensity,
          category: compassResult._category,
          estimatedPrice: compassResult._estimatedPrice,
          consecutiveNonAnswers: compassResult._consecutiveNonAnswers,
          turnsSinceCoverageAdvanced: compassResult.turnsSinceCoverageAdvanced,
        });

        // Persist context as lastAssessment JSON
        const lastAssessmentJson = JSON.stringify(compassResult._persistedContext);

        // Save based on decision type
        if (compassResult.decisionType === "out-of-scope") {
          const messageId = await ctx.runMutation(internal.conversations.saveResponse, {
            conversationId: args.conversationId,
            content: responseText,
            lastAssessment: lastAssessmentJson,
          });
          traceData.messageId = messageId;
        } else if (compassResult.closing && compassResult.decision) {
          // Auto-resolve: save with decision
          const messageId = await ctx.runMutation(
            internal.conversations.saveResponseWithDecision,
            {
              conversationId: args.conversationId,
              content: responseText,
              decision: compassResult.decision,
              intensity: compassResult.intensity,
              coverageRatio: compassResult.coverageRatio,
              category: compassResult._category,
              estimatedPrice: compassResult._estimatedPrice,
              item: compassResult._item,
              lastAssessment: lastAssessmentJson,
              consecutiveNonAnswers: compassResult._consecutiveNonAnswers,
              reactionText: responseText,
              hankScore: compassResult.hankScore,
            }
          );
          traceData.messageId = messageId;
        } else {
          // Normal turn: save with compass data
          const messageId = await ctx.runMutation(
            internal.conversations.saveResponseWithCompass,
            {
              conversationId: args.conversationId,
              content: responseText,
              intensity: compassResult.intensity,
              coverageRatio: compassResult.coverageRatio,
              category: compassResult._category,
              estimatedPrice: compassResult._estimatedPrice,
              item: compassResult._item,
              lastAssessment: lastAssessmentJson,
              consecutiveNonAnswers: compassResult._consecutiveNonAnswers,
            }
          );
          traceData.messageId = messageId;
        }

        // Increment memory reference count for all nudged conversations
        for (const nudgeId of memoryNudgeConversationIds) {
          try {
            await ctx.runMutation(
              internal.conversations.internalIncrementMemoryRef,
              { conversationId: nudgeId }
            );
          } catch (e) {
            console.error("Failed to increment memory ref (non-fatal):", e);
          }
        }

        await saveTraceQuietly();
      } catch (error) {
        console.error("LLM generation failed:", error);
        if (traceData.rawResponse || traceData.toolCalled !== undefined) {
          Object.assign(traceData, {
            decisionType: "error",
            error: String(error),
            newIntensity: traceData.previousIntensity ?? "CURIOUS",
            rawResponse: traceData.rawResponse ?? "",
            parsedResponse: traceData.parsedResponse ?? "{}",
            sanitizedScores: traceData.sanitizedScores ?? "{}",
            rawScores: traceData.rawScores ?? "{}",
            scoringResult: traceData.scoringResult ?? "{}",
            consecutiveNonAnswers: traceData.consecutiveNonAnswers ?? 0,
            turnsSinceCoverageAdvanced: traceData.turnsSinceCoverageAdvanced ?? 0,
            tokenUsage: traceData.tokenUsage ?? { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
            durationMs: traceData.durationMs ?? 0,
          });
          await saveTraceQuietly();
        }
        throw error;
      }
    }

    try {
      await executeRespond(primaryModel);
    } catch (primaryError) {
      console.error(`Primary model (${primaryModel}) failed:`, primaryError);
      if (fallbackModel && fallbackModel !== primaryModel) {
        console.warn(`Retrying with fallback: ${fallbackModel}`);
        try {
          await executeRespond(fallbackModel);
          return;
        } catch (fallbackError) {
          console.error(`Fallback (${fallbackModel}) also failed:`, fallbackError);
        }
      }
      await ctx.runMutation(internal.conversations.setError, {
        conversationId: args.conversationId,
      });
    }
  },
});
