"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { chatCompletion, type ChatMessage } from "./openrouter";
import { buildSystemPrompt, buildMessages, buildConversationMessages, buildToolDefinition, buildOpenerPrompt, buildCloserPrompt, buildClosingToolDefinition } from "./prompt";
import { extractRecentMoves } from "./moves";
import { selectMemoryNudge, formatNudgePrompt } from "./memory";

// LLM temperature settings
const TEMPERATURE_ASSESSMENT = 0.8;
const TEMPERATURE_RESPONSE = 0.8;
import {
  computeTurnDelta,
  getStartingScore,
  determineStance,
  applyStanceGuardrails,
  computePriceModifier,
  STANCE_ORDER,
  type TurnAssessment,
  type TurnSummary,
  type Stance,
  type ScoringResult,
  type Intent,
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
  turnSummaries: TurnSummary[];
  memoryNudgeUsed?: boolean;
}

const DEFAULT_PERSISTED: PersistedContext = {
  item: "unknown",
  estimated_price: 0,
  category: "other",
  intent: "want",
  turnSummaries: [],
};

// --- Default assessment for sanitization ---

const DEFAULT_ASSESSMENT: TurnAssessment = {
  item: "unknown",
  intent: "want",
  estimated_price: 0,
  category: "other",
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

/** Fallback when LLM skips tool call: new_angle:false → sanitizeAssessment fills safe defaults, delta = 0 */
const FALLBACK_ASSESSMENT: Record<string, unknown> = { new_angle: false };

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
    // Intent: keep from turn 1 unless user explicitly shifts
    intent: assessment.intent !== "want" ? assessment.intent : prev.intent,
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
  _patience: number;
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
  patience: number;
  runningScore: number;
  storedItem?: string;
  turnCount: number;
  previousContext?: PersistedContext | null;
}

// --- Closing brief for enriched closing guidance ---

interface ClosingBrief {
  winningArgument?: string;
  weakestMoment?: string;
  itemContext: string;
}

function buildClosingBrief(
  turnSummaries: TurnSummary[],
  item?: string,
  estimatedPrice?: number,
): ClosingBrief {
  const itemContext = item && item !== "unknown"
    ? estimatedPrice && estimatedPrice > 0
      ? `${item} ($${estimatedPrice})`
      : item
    : "their item";

  let winningArgument: string | undefined;
  let weakestMoment: string | undefined;

  if (turnSummaries.length > 0) {
    // Find highest-delta topic (winning argument)
    const best = turnSummaries.reduce((a, b) => (b.delta > a.delta ? b : a));
    if (best.delta > 0 && best.topic) {
      winningArgument = best.topic;
    }

    // Find lowest/most-negative-delta topic (weakest moment)
    const worst = turnSummaries.reduce((a, b) => (b.delta < a.delta ? b : a));
    if (worst.topic) {
      weakestMoment = worst.topic;
    }
  }

  return { winningArgument, weakestMoment, itemContext };
}

function executeGetStance(rawAssessmentInput: Record<string, unknown>, state: ConversationState): GetStanceResult {
  const { currentStance, disengagementCount, patience, runningScore, storedItem, turnCount } = state;

  const assessment = sanitizeAssessment(rawAssessmentInput);
  const coalesced = coalesceTurnContext(assessment, state.previousContext ?? null);
  const estimatedPrice = coalesced.estimated_price > 0 ? coalesced.estimated_price : undefined;
  const category = coalesced.category;
  const item = coalesced.item && coalesced.item !== "unknown" ? coalesced.item : storedItem;

  // Price modifier
  const priceModifier = computePriceModifier(estimatedPrice);
  const thresholdMultiplier = priceModifier;

  // Build persisted context (will be updated with turnSummary below)
  const prevSummaries = state.previousContext?.turnSummaries ?? [];
  // Sticky flags that must carry forward across all branches
  const stickyFlags = {
    ...(state.previousContext?.memoryNudgeUsed ? { memoryNudgeUsed: true as const } : {}),
  };
  // Fallback for early-exit branches that don't modify context
  const unchangedContext: PersistedContext = state.previousContext ?? { ...DEFAULT_PERSISTED, ...coalesced, turnSummaries: [] };

  // Helper to build scoring result
  function makeScoringResult(score: number, delta: number): ScoringResult {
    return { runningScore: score, delta, stance: determineStance(score, thresholdMultiplier), thresholdMultiplier, priceModifier };
  }

  // 1. Out of scope → no scoring, deflect
  if (assessment.is_out_of_scope) {
    return {
      stance: currentStance,
      score: runningScore,
      guidance: "This is out of scope. Deflect with personality using the OUT OF SCOPE guidelines.",
      _disengagementCount: disengagementCount,
      _patience: patience,
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
    const brief = buildClosingBrief(prevSummaries, item, estimatedPrice);
    const winRef = brief.winningArgument ? ` Reference what convinced you: their argument about '${brief.winningArgument}'.` : "";
    return {
      stance: "CONCEDE",
      score: runningScore,
      guidance: `You already conceded. Reiterate briefly — grudging approval + a specific warning about ${brief.itemContext}.${winRef} Don't re-argue. 1 sentence.`,
      verdict: "approved",
      closing: true,
      _disengagementCount: disengagementCount,
      _patience: patience,
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
    const brief = buildClosingBrief(prevSummaries, item, estimatedPrice);
    const winRef = brief.winningArgument ? ` They almost had you with '${brief.winningArgument}' — acknowledge that.` : "";
    const persistedContext: PersistedContext = { ...coalesced, ...stickyFlags, turnSummaries: prevSummaries };
    return {
      stance: currentStance,
      score: runningScore,
      guidance: `Victory. The user backed down.${winRef} Dry victory line — don't pile on. 1 sentence, mic drop.`,
      verdict: "denied",
      closing: true,
      _disengagementCount: 0,
      _patience: 0,
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
    const brief = buildClosingBrief(prevSummaries, item, estimatedPrice);
    const persistedContext: PersistedContext = { ...coalesced, ...stickyFlags, turnSummaries: prevSummaries };
    return {
      stance: currentStance,
      score: nonAnswerScore,
      guidance: `They checked out. They wasted both your time on ${brief.itemContext}. Punchy and final — 1 sentence.`,
      verdict: "denied",
      closing: true,
      _disengagementCount: disengagementCount + 1,
      _patience: patience,
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
    const persistedContext: PersistedContext = { ...coalesced, ...stickyFlags, turnSummaries: prevSummaries };
    return {
      stance: currentStance,
      score: nonAnswerScore,
      guidance: `The user gave a non-answer. Stay at your stance. Push them to make a real argument. Something like "That's not an argument. What's actually wrong with what you have now."`,
      _disengagementCount: 1,
      _patience: patience,
      _category: category,
      _estimatedPrice: estimatedPrice,
      _item: item,
      _decisionType: "disengagement-increment",
      _scoringResult: makeScoringResult(nonAnswerScore, -5),
      _persistedContext: persistedContext,
    };
  }

  // 6. Directed question → patience +1, no score change, reset disengagement
  if (assessment.is_directed_question) {
    const newPatience = patience + 1;
    const persistedContext: PersistedContext = { ...coalesced, ...stickyFlags, turnSummaries: prevSummaries };

    // Patience exhausted on directed questions
    if (newPatience >= 10) {
      const brief = buildClosingBrief(prevSummaries, item, estimatedPrice);
      return {
        stance: currentStance,
        score: runningScore,
        guidance: `They've been asking questions instead of making a case for ${brief.itemContext}. You're done. 1 sentence, mic drop.`,
        verdict: "denied",
        closing: true,
        _disengagementCount: 0,
        _patience: newPatience,
        _category: category,
        _estimatedPrice: estimatedPrice,
        _item: item,
        _decisionType: "patience-denied",
        _scoringResult: makeScoringResult(runningScore, 0),
        _persistedContext: persistedContext,
      };
    }

    // Patience warning for directed questions
    let patienceGuidance = "";
    if (newPatience >= 8) {
      patienceGuidance = " Last chance. If they don't give you something real, you're done next turn.";
    } else if (newPatience >= 6) {
      patienceGuidance = " Your patience is almost gone. Tell them to make a real argument or you're closing this.";
    } else if (newPatience >= 4) {
      patienceGuidance = " They're not building a case. Push them to give you something concrete.";
    }

    return {
      stance: currentStance,
      score: runningScore,
      guidance: "They're asking you to explain yourself. Answer their question directly, then push for something new about their purchase case." + patienceGuidance,
      _disengagementCount: 0,
      _patience: newPatience,
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

  // 7b. Patience: drains on zero/negative delta, restores on positive delta
  let newPatience: number;
  if (turnCount === 1) {
    newPatience = 0;
  } else if (delta > 0) {
    newPatience = Math.max(0, patience - 4);
  } else {
    newPatience = patience + 3;
  }

  // 7a. Collapse: score < -5 AND turnCount > 3 → denied
  if (newRunningScore < -5 && turnCount > 3) {
    const newSummary: TurnSummary = { turn: turnCount, delta, topic: assessment.challenge_topic, addressed: assessment.challenge_addressed, evidence: assessment.evidence_provided };
    const allSummaries = [...prevSummaries, newSummary];
    const brief = buildClosingBrief(allSummaries, item, estimatedPrice);
    const weakRef = brief.weakestMoment ? ` Their weakest moment was '${brief.weakestMoment}' — reference it.` : "";
    const persistedContext: PersistedContext = { ...coalesced, ...stickyFlags, turnSummaries: allSummaries };
    return {
      stance: currentStance,
      score: newRunningScore,
      guidance: `Their case collapsed.${weakRef} Final denial — emotion without substance. 1-2 sentences, make it sting.`,
      verdict: "denied",
      closing: true,
      _disengagementCount: 0,
      _patience: newPatience,
      _category: category,
      _estimatedPrice: estimatedPrice,
      _item: item,
      _decisionType: "collapse-denied",
      _scoringResult: makeScoringResult(newRunningScore, delta),
      _persistedContext: persistedContext,
    };
  }

  if (newPatience >= 10) {
    const newSummary: TurnSummary = { turn: turnCount, delta, topic: assessment.challenge_topic, addressed: assessment.challenge_addressed, evidence: assessment.evidence_provided };
    const allSummaries = [...prevSummaries, newSummary];
    const brief = buildClosingBrief(allSummaries, item, estimatedPrice);
    const persistedContext: PersistedContext = { ...coalesced, ...stickyFlags, turnSummaries: allSummaries };
    return {
      stance: currentStance,
      score: newRunningScore,
      guidance: `Patience gone on ${brief.itemContext}. They had their chances. 1 sentence, mic drop.`,
      verdict: "denied",
      closing: true,
      _disengagementCount: 0,
      _patience: newPatience,
      _category: category,
      _estimatedPrice: estimatedPrice,
      _item: item,
      _decisionType: "patience-denied",
      _scoringResult: makeScoringResult(newRunningScore, delta),
      _persistedContext: persistedContext,
    };
  }

  // Patience warnings
  let patienceWarning = "";
  if (newPatience >= 8) {
    patienceWarning = " Last chance. If they don't give you something real, you're done next turn.";
  } else if (newPatience >= 6) {
    patienceWarning = " Your patience is almost gone. Tell them to make a real argument or you're closing this.";
  } else if (newPatience >= 4) {
    patienceWarning = " They're not building a case. Push them to give you something concrete.";
  }

  // 7c. Determine stance from new score
  const computedStance = determineStance(newRunningScore, thresholdMultiplier);
  const guardrailedStance = applyStanceGuardrails(computedStance, currentStance, turnCount);

  // Build turn summary
  const newSummary: TurnSummary = { turn: turnCount, delta, topic: assessment.challenge_topic, addressed: assessment.challenge_addressed, evidence: assessment.evidence_provided };
  const persistedContext: PersistedContext = { ...coalesced, ...stickyFlags, turnSummaries: [...prevSummaries, newSummary] };

  // Stance guidance — enriched for CONCEDE
  let guidance: string;
  if (guardrailedStance === "CONCEDE") {
    const brief = buildClosingBrief([...prevSummaries, newSummary], item, estimatedPrice);
    const winRef = brief.winningArgument ? ` Reference what convinced you: their argument about '${brief.winningArgument}'.` : "";
    guidance = `They earned it. Concede like it costs you something.${winRef} Don't say "you thought this through" — be specific to THIS conversation. 1-2 sentences. Grudging approval + specific warning about ${brief.itemContext}.`;
  } else {
    const stanceGuidance: Record<Stance, string> = {
      IMMOVABLE: "Pure impulse. No valid case. Push hard. Do NOT concede.",
      FIRM: "Weak case. Hold the line. Do NOT concede.",
      SKEPTICAL: "Half a case. Acknowledge what's valid, push on what's weak. Do NOT concede.",
      RELUCTANT: "Strong case but not fully convinced. Push for final proof. Do NOT concede.",
      CONCEDE: "", // handled above
    };
    guidance = stanceGuidance[guardrailedStance] + patienceWarning;
  }

  return {
    stance: guardrailedStance,
    score: newRunningScore,
    guidance,
    verdict: guardrailedStance === "CONCEDE" ? "approved" : undefined,
    closing: guardrailedStance === "CONCEDE" ? true : undefined,
    _disengagementCount: 0,
    _patience: newPatience,
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
  
        const currentStance = toStance(conversation.stance);
        const disengagementCount = conversation.disengagementCount ?? 0;
        const patience = conversation.stagnationCount ?? 0;  // patience meter (reuses DB field)
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
              turnSummaries: Array.isArray(parsed.turnSummaries) ? parsed.turnSummaries : [],
              memoryNudgeUsed: parsed.memoryNudgeUsed === true,
            };
          } catch {
            previousContext = null;
          }
        }
  
        const displayName = await ctx.runQuery(
          internal.conversations.internalGetUserName,
          { userId: args.userId }
        );
  
        // Fetch past conversations (needed for memory nudge on stance softening)
        const pastConversations = await ctx.runQuery(
          internal.conversations.internalGetPastConversations,
          { userId: args.userId, excludeConversationId: args.conversationId }
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
          patience,
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
          stagnationCount: patience,
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
  
        // 5. Extract assessment — tool call or conservative fallback
        let rawAssessment: Record<string, unknown>;
        let usedFallback = false;
  
        if (toolCall && toolCall.function.name === "get_stance") {
          traceData.toolCalled = true;
          // Parse tool arguments defensively
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
          usedFallback = true;
          traceData.toolCalled = false;
        }
  
        // Execute scoring (always — fallback produces delta = 0)
        const stanceResult = executeGetStance(rawAssessment, {
          currentStance,
          disengagementCount,
          patience,
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
  
        // Select memory nudge on first stance softening (FIRM→SKEPTICAL, SKEPTICAL→RELUCTANT, etc.)
        let memoryNudge: string | null = null;
        let memoryNudgeConversationId: Id<"conversations"> | null = null;
  
        if (
          turnCount > 1 &&
          stanceResult._decisionType.startsWith("normal") &&
          !stanceResult.closing &&
          !stanceResult._persistedContext.memoryNudgeUsed &&
          STANCE_ORDER.indexOf(stanceResult.stance) > STANCE_ORDER.indexOf(currentStance)
        ) {
          const nudge = selectMemoryNudge(pastConversations, stanceResult._category);
          if (nudge) {
            memoryNudge = formatNudgePrompt(nudge);
            memoryNudgeConversationId = nudge.conversationId as Id<"conversations">;
            stanceResult._persistedContext.memoryNudgeUsed = true;
          }
        }
  
        // Select focused prompt for Call 2 when it matters
        // Closer always takes priority; opener only for normal scoring turns on turn 1
        let call2SystemPrompt: string;
        if (stanceResult.closing && stanceResult.verdict) {
          call2SystemPrompt = buildCloserPrompt({
            displayName: displayName ?? undefined,
            estimatedPrice: stanceResult._estimatedPrice,
            category: stanceResult._category,
            verdict: stanceResult.verdict,
          });
        } else if (turnCount === 1 && stanceResult._decisionType.startsWith("normal")) {
          call2SystemPrompt = buildOpenerPrompt({
            displayName: displayName ?? undefined,
            estimatedPrice: stanceResult._estimatedPrice,
            category: stanceResult._category,
          });
        } else {
          call2SystemPrompt = memoryNudge
            ? systemPrompt + "\n\n" + memoryNudge
            : systemPrompt;
        }
  
        // Capture Call 2 prompt in trace when it differs from Call 1
        if (call2SystemPrompt !== systemPrompt) {
          traceData.call2SystemPrompt = call2SystemPrompt;
        }
  
        // Build messages for call 2
        const conversationMsgs = buildConversationMessages(
          messages.map((m) => ({ role: m.role, content: m.content }))
        );
        let call2Messages: ChatMessage[];
        if (usedFallback) {
          // No tool call to include — append guidance to system prompt
          call2Messages = [
            { role: "system", content: call2SystemPrompt + "\n\nSCORING: " + toolResultStr },
            ...conversationMsgs,
          ];
        } else {
          call2Messages = [
            { role: "system", content: call2SystemPrompt },
            ...conversationMsgs,
            {
              role: "assistant",
              content: null,
              tool_calls: [toolCall!],
            },
            {
              role: "tool",
              tool_call_id: toolCall!.id,
              content: toolResultStr,
            },
          ];
        }
  
        // CALL 2: LLM generates response using stance guidance (higher temp for voice variety)
        const isClosingTurn = !!(stanceResult.closing && stanceResult.verdict);
        const closingTool = isClosingTurn ? buildClosingToolDefinition() : undefined;
  
        const call2 = await chatCompletion({
          messages: call2Messages,
          modelId,
          temperature: TEMPERATURE_RESPONSE,
          maxTokens: 400,
          ...(closingTool ? {
            tools: [closingTool],
            tool_choice: { type: "function", function: { name: "closing_response" } },
          } : {}),
        });
  
        const durationMs = Date.now() - llmStart;
        const totalUsage = addUsage(call1Usage, call2.usage);
  
        let responseText: string;
        let excuse: string | undefined;
        let verdictTagline: string | undefined;
  
        if (isClosingTurn && call2.toolCalls?.[0]?.function.name === "closing_response") {
          try {
            const parsed = JSON.parse(call2.toolCalls[0].function.arguments);
            responseText = typeof parsed.closing_line === "string" && parsed.closing_line
              ? parsed.closing_line
              : (call2.content ?? "");
            excuse = typeof parsed.excuse === "string" && parsed.excuse.length > 0 ? parsed.excuse.slice(0, 60) : undefined;
            verdictTagline = typeof parsed.verdict_tagline === "string" && parsed.verdict_tagline.length > 0 ? parsed.verdict_tagline.slice(0, 30) : undefined;
          } catch {
            responseText = call2.content ?? "";
          }
        } else {
          responseText = call2.content ?? "";
        }
  
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
          decisionType: stanceResult._decisionType + (usedFallback ? " (fallback)" : ""),
          newStance: stanceResult.stance,
          category: stanceResult._category,
          estimatedPrice: stanceResult._estimatedPrice,
          disengagementCount: stanceResult._disengagementCount,
          stagnationCount: stanceResult._patience,
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
              stagnationCount: stanceResult._patience,
              excuse,
              verdictTagline,
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
              stagnationCount: stanceResult._patience,
            }
          );
          traceData.messageId = messageId;
        }
  
        // Increment memory reference count (only when nudge was used)
        if (memoryNudgeConversationId) {
          await ctx.runMutation(
            internal.conversations.internalIncrementMemoryRef,
            { conversationId: memoryNudgeConversationId }
          );
        }
  
        await saveTraceQuietly();
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
