"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { chatCompletion, type ChatMessage } from "./openrouter";
import { buildSystemPrompt, buildAssessmentPrompt, buildMessages, buildConversationMessages, buildToolDefinition, buildOpenerPrompt, buildCloserPrompt, buildClosingToolDefinition, buildVerdictSummaryPrompt } from "./prompt";
import { extractRecentMoves } from "./moves";
import { selectMemoryNudge, formatNudgePrompt } from "./memory";
import { computeWorkHours, formatWorkHoursBlock } from "./workHours";

// LLM temperature settings
const TEMPERATURE_ASSESSMENT = 0.8;
const TEMPERATURE_RESPONSE = 0.8;
import {
  computeTurnDelta,
  getStartingScore,
  determineStance,
  applyStanceGuardrails,
  computePriceModifier,
  computeShareScore,
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
  memoryNudgeText?: string;
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
    category: (["electronics", "vehicles", "fashion", "furniture", "kitchen", "travel", "entertainment", "sports_fitness", "beauty", "subscriptions", "hardware", "essentials", "safety_health", "other"] as const).includes(raw.category as any)
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
    ...(state.previousContext?.memoryNudgeText ? { memoryNudgeText: state.previousContext.memoryNudgeText } : {}),
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
  call3SystemPrompt: string;
  call3RawResponse: string;
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

/** Strip labels, markdown, and wrapping quotes from verdict summary LLM output. */
function cleanVerdictSummary(raw: string): string {
  let cleaned = raw;
  // Strip markdown bold/italic markers
  cleaned = cleaned.replace(/\*{1,3}/g, "");
  // Strip label prefixes (e.g. "Share card verdict:", "Verdict summary:")
  cleaned = cleaned.replace(/^.*?verdict[^:]*:\s*/i, "");
  // Strip wrapping quotes
  cleaned = cleaned.replace(/^[""\u201C]|[""\u201D]$/g, "").trim();
  return cleaned;
}

/** Build a structured SCORING YAML block for Call 2 system prompt. */
function buildScoringBlock(
  stanceResult: GetStanceResult,
  sanitized: TurnAssessment,
): string {
  const lines: string[] = [
    "SCORING:",
    `  stance: ${stanceResult.stance}`,
    `  guidance: ${stanceResult.guidance}`,
  ];
  if (stanceResult.verdict) {
    lines.push(`  verdict: ${stanceResult.verdict}`);
  }
  lines.push(
    "  assessment:",
    `    challenge_addressed: ${sanitized.challenge_addressed}`,
    `    evidence_provided: ${sanitized.evidence_provided}`,
    `    new_angle: ${sanitized.new_angle}`,
    `    emotional_reasoning: ${sanitized.emotional_reasoning}`,
    `    topic: ${sanitized.challenge_topic || "(none)"}`,
  );
  return lines.join("\n");
}

/** Extract closing_line from a Call 2 result, returning "" if not found. */
function extractClosingLine(result: { content: string | null; toolCalls: { function: { name: string; arguments: string } }[] | null }): string {
  if (result.toolCalls?.[0]?.function.name === "closing_response") {
    try {
      const parsed = JSON.parse(result.toolCalls[0].function.arguments);
      if (typeof parsed.closing_line === "string" && parsed.closing_line) {
        return parsed.closing_line;
      }
    } catch { /* bad JSON — fall through */ }
  }
  return result.content ?? "";
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

        // Sliding context window: for turns 9+, keep first user message + last 6 messages
        // The lastAssessment JSON carries forward context, so the LLM doesn't lose info
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
              memoryNudgeText: typeof parsed.memoryNudgeText === "string" ? parsed.memoryNudgeText : undefined,
            };
          } catch {
            previousContext = null;
          }
        }
  
        const userInfo = await ctx.runQuery(
          internal.conversations.internalGetUserInfo,
          { userId: args.userId }
        );
        const displayName = userInfo.displayName;
        const userTimezone = userInfo.timezone ?? undefined;
        const userIncomeAmount = userInfo.incomeAmount ?? undefined;
        const userIncomeType = (userInfo.incomeType ?? undefined) as "hourly" | "annual" | undefined;
  
        // Fetch past conversations (needed for memory nudge on stance softening)
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

        const promptConfig = {
          displayName: displayName ?? undefined,
          stance: currentStance,
          disengagementCount,
          estimatedPrice: previousContext?.estimated_price ?? conversation.estimatedPrice,
          category: previousContext?.category ?? conversation.category,
          patience,
          turnCount,
          turnSummaries: previousContext?.turnSummaries,
          recentMoves,
          workHoursBlock,
        };

        // Extract previous context fields for assessment prompt
        const lastChallengeTopic = previousContext?.turnSummaries?.length
          ? previousContext.turnSummaries[previousContext.turnSummaries.length - 1].topic
          : undefined;

        // Call 1: assessment-only prompt (no voice/format guidance)
        const assessmentPrompt = buildAssessmentPrompt({
          stance: currentStance,
          disengagementCount,
          estimatedPrice: previousContext?.estimated_price ?? conversation.estimatedPrice,
          category: previousContext?.category ?? conversation.category,
          patience,
          turnCount,
          turnSummaries: previousContext?.turnSummaries,
          previousItem: previousContext?.item,
          previousIntent: previousContext?.intent,
          lastChallengeTopic: lastChallengeTopic || undefined,
        });

        // Call 2: response-only prompt (no tool instructions)
        const systemPrompt = buildSystemPrompt(promptConfig);

        const llmMessages = buildMessages(
          assessmentPrompt,
          windowedMessages.map((m) => ({ role: m.role, content: m.content }))
        );

        // 3. Build tool definition
        const toolDef = buildToolDefinition();

        // Capture input context for trace
        Object.assign(traceData, {
          previousStance: currentStance,
          systemPrompt: assessmentPrompt,
          messagesArray: JSON.stringify(llmMessages),
          modelId,
          temperature: TEMPERATURE_ASSESSMENT,
          maxTokens: 500,
          disengagementCount,
          stagnationCount: patience,
        });

        // 4. CALL 1: LLM with tool available (low temp for consistent classification)
        const llmStart = Date.now();
        const call1 = await chatCompletion({
          messages: llmMessages,
          modelId,
          temperature: TEMPERATURE_ASSESSMENT,
          maxTokens: 500,
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
            maxTokens: 500,
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

        // Sanitize assessment early — used for both scoring block and trace
        const sanitizedAssessment = sanitizeAssessment(rawAssessment);

        // Build scoring block for Call 2 system prompt
        const scoringBlock = buildScoringBlock(stanceResult, sanitizedAssessment);

        const toolResultStr = JSON.stringify({
          stance: stanceResult.stance,
          score: stanceResult.score,
          guidance: stanceResult.guidance,
          ...(stanceResult.verdict ? { verdict: stanceResult.verdict } : {}),
          ...(stanceResult.closing ? { closing: stanceResult.closing } : {}),
        });
        traceData.toolResult = toolResultStr;
  
        // Select memory nudge on turn 2+ if not yet stored
        let memoryNudgeConversationId: Id<"conversations"> | null = null;
  
        if (
          turnCount >= 2 &&
          !stanceResult._persistedContext.memoryNudgeText &&
          !stanceResult.closing
        ) {
          const nudge = selectMemoryNudge(pastConversations, stanceResult._category, userTimezone);
          if (nudge) {
            memoryNudgeConversationId = nudge.conversationId as Id<"conversations">;
            stanceResult._persistedContext.memoryNudgeText = formatNudgePrompt(nudge);
          }
        }
  
        // Select focused prompt for Call 2 when it matters
        // Closer always takes priority; opener only for normal scoring turns on turn 1
        // Get nudge text — either just-selected or carried from a previous turn
        const nudgeText = stanceResult._persistedContext.memoryNudgeText ?? null;

        let call2SystemPrompt: string;
        if (stanceResult.closing && stanceResult.verdict) {
          call2SystemPrompt = buildCloserPrompt({
            displayName: displayName ?? undefined,
            estimatedPrice: stanceResult._estimatedPrice,
            category: stanceResult._category,
            verdict: stanceResult.verdict,
          });
        } else if (turnCount === 1 && stanceResult._decisionType.startsWith("normal")) {
          // For opener, compute work hours fresh from the just-extracted price
          const openerWorkHoursBlock = formatWorkHoursBlock(
            computeWorkHours(stanceResult._estimatedPrice, userIncomeAmount, userIncomeType)
          );
          call2SystemPrompt = buildOpenerPrompt({
            displayName: displayName ?? undefined,
            estimatedPrice: stanceResult._estimatedPrice,
            category: stanceResult._category,
            workHoursBlock: openerWorkHoursBlock,
          });
        } else {
          // Recompute work hours with current-turn price (avoids one-turn lag)
          let call2Base = systemPrompt;
          if (stanceResult._estimatedPrice && stanceResult._estimatedPrice !== priceForWorkHours) {
            const updatedWorkHoursBlock = formatWorkHoursBlock(
              computeWorkHours(stanceResult._estimatedPrice, userIncomeAmount, userIncomeType)
            );
            call2Base = buildSystemPrompt({ ...promptConfig, workHoursBlock: updatedWorkHoursBlock });
          }
          call2SystemPrompt = nudgeText
            ? call2Base + "\n\n" + nudgeText
            : call2Base;
        }
  
        // Append scoring block to Call 2 system prompt
        call2SystemPrompt += "\n\n" + scoringBlock;

        // Always capture Call 2 prompt — prompts always differ now (assessment vs response)
        traceData.call2SystemPrompt = call2SystemPrompt;

        // Build messages for Call 2 — unified path: scoring block in system prompt
        const conversationMsgs = buildConversationMessages(
          windowedMessages.map((m) => ({ role: m.role, content: m.content }))
        );
        const call2Messages: ChatMessage[] = [
          { role: "system", content: call2SystemPrompt },
          ...conversationMsgs,
        ];
  
        // CALL 2: LLM generates response using stance guidance (higher temp for voice variety)
        const isClosingTurn = !!(stanceResult.closing && stanceResult.verdict);
        const closingTool = isClosingTurn ? buildClosingToolDefinition() : undefined;
  
        const call2Params = {
          messages: call2Messages,
          modelId,
          temperature: TEMPERATURE_RESPONSE,
          maxTokens: 400,
          ...(closingTool ? {
            tools: [closingTool],
            tool_choice: { type: "function" as const, function: { name: "closing_response" } },
          } : {}),
        };

        const call2 = await chatCompletion(call2Params);

        let totalUsage = addUsage(call1Usage, call2.usage);
        let durationMs = Date.now() - llmStart;

        let responseText: string;

        if (isClosingTurn) {
          // Extract closing_line from tool call result
          responseText = extractClosingLine(call2);

          // Retry once if empty (mirrors Call 1 retry pattern)
          if (!responseText) {
            console.warn("Call 2 closing_line empty — retrying (attempt 2)");
            const retry = await chatCompletion(call2Params);
            totalUsage = addUsage(totalUsage, retry.usage);
            durationMs = Date.now() - llmStart;
            responseText = extractClosingLine(retry);
          }

          // Hardcoded fallback — better than an error state
          if (!responseText) {
            console.warn("Call 2 closing_line still empty after retry — using fallback");
            responseText = stanceResult.verdict === "approved"
              ? "Fine. Go buy it."
              : "No.";
          }
        } else {
          responseText = call2.content ?? "";
          if (!responseText) {
            throw new Error("Call 2 returned empty content");
          }
        }
  
        // Capture trace data
        Object.assign(traceData, {
          durationMs,
          rawResponse: responseText,
          tokenUsage: totalUsage,
          rawScores: JSON.stringify(sanitizedAssessment),
          sanitizedScores: JSON.stringify(stanceResult._persistedContext),
          scoringResult: JSON.stringify(stanceResult._scoringResult),
          parsedResponse: JSON.stringify({ response: responseText, assessment: rawAssessment }),
          decisionType: stanceResult._decisionType + (traceData.toolCalled === false ? " (fallback)" : ""),
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
          // Compute debate strength score for share cards
          const shareScore = computeShareScore(
            stanceResult.score,
            stanceResult._scoringResult.thresholdMultiplier,
            stanceResult._persistedContext.turnSummaries,
          );

          // Save closing line + verdict immediately (UI shows card right away)
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
              verdictSummary: undefined,
              shareScore,
            }
          );
          traceData.messageId = messageId;

          // CALL 3: Generate verdict summary for share cards (non-fatal)
          // Runs after save so the user sees the closing line immediately
          try {
            const summarySystemPrompt = buildVerdictSummaryPrompt({
              item: stanceResult._item,
              estimatedPrice: stanceResult._estimatedPrice,
              category: stanceResult._category,
              verdict: stanceResult.verdict,
            });

            traceData.call3SystemPrompt = summarySystemPrompt;

            // Append Hank's closing response so Call 3 sees the complete conversation.
            const call3Messages: ChatMessage[] = [
              { role: "system", content: summarySystemPrompt },
              ...conversationMsgs,
              { role: "assistant", content: responseText },
            ];

            const call3 = await chatCompletion({
              messages: call3Messages,
              modelId,
              temperature: TEMPERATURE_RESPONSE,
              maxTokens: 80,
            });

            let rawSummary = (call3.content ?? "").trim();
            traceData.call3RawResponse = rawSummary || "(empty)";
            totalUsage = addUsage(totalUsage, call3.usage);

            // Retry if too long (over 25 words) — nudge for brevity
            if (rawSummary && rawSummary.split(/\s+/).length > 25) {
              console.warn(`Call 3 verdict too long (${rawSummary.split(/\s+/).length} words), retrying shorter`);
              try {
                const call3Shorter = await chatCompletion({
                  messages: [
                    ...call3Messages,
                    { role: "assistant", content: rawSummary },
                    { role: "user", content: "Shorter. One sentence max." },
                  ],
                  modelId,
                  temperature: TEMPERATURE_RESPONSE,
                  maxTokens: 80,
                });
                const shorterSummary = (call3Shorter.content ?? "").trim();
                if (shorterSummary) {
                  rawSummary = shorterSummary;
                  traceData.call3RawResponse += ` -> (shortened) ${shorterSummary}`;
                }
                totalUsage = addUsage(totalUsage, call3Shorter.usage);
              } catch (shortenErr) {
                console.warn("Call 3 shorten retry failed, using original:", shortenErr);
              }
            }

            // Retry with fallback model if primary returned empty
            if (!rawSummary && fallbackModel && fallbackModel !== modelId) {
              console.warn(`Call 3 empty from ${modelId}, retrying with fallback: ${fallbackModel}`);
              try {
                const call3Retry = await chatCompletion({
                  messages: call3Messages,
                  modelId: fallbackModel,
                  temperature: TEMPERATURE_RESPONSE,
                  maxTokens: 80,
                });
                rawSummary = (call3Retry.content ?? "").trim();
                traceData.call3RawResponse = rawSummary
                  ? `(fallback) ${rawSummary}`
                  : "(fallback empty)";
                totalUsage = addUsage(totalUsage, call3Retry.usage);
              } catch (fallbackErr) {
                console.error(`Call 3 fallback (${fallbackModel}) also failed:`, fallbackErr);
                traceData.call3RawResponse = `(fallback error) ${String(fallbackErr)}`;
              }
            }

            if (rawSummary) {
              const verdictSummary = cleanVerdictSummary(rawSummary);
              await ctx.runMutation(internal.conversations.patchVerdictSummary, {
                conversationId: args.conversationId,
                verdictSummary,
              });
            } else {
              // Hard fallback: use Hank's closing line rather than infinite loading
              console.warn("Call 3: all models failed/empty, using responseText as verdictSummary");
              await ctx.runMutation(internal.conversations.patchVerdictSummary, {
                conversationId: args.conversationId,
                verdictSummary: cleanVerdictSummary(responseText),
              });
            }
          } catch (call3Error) {
            console.error("Call 3 (verdict summary) failed (non-fatal):", call3Error);
            traceData.call3RawResponse = `ERROR: ${String(call3Error)}`;
            // Hard fallback on outer error: use closing line
            try {
              await ctx.runMutation(internal.conversations.patchVerdictSummary, {
                conversationId: args.conversationId,
                verdictSummary: cleanVerdictSummary(responseText),
              });
            } catch (patchErr) {
              console.error("Failed to save hard fallback verdictSummary:", patchErr);
            }
          }

          // Update timing + tokens to include Call 3
          traceData.durationMs = Date.now() - llmStart;
          traceData.tokenUsage = totalUsage;
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
        // Non-fatal: message is already saved, don't error the turn over this
        if (memoryNudgeConversationId) {
          try {
            await ctx.runMutation(
              internal.conversations.internalIncrementMemoryRef,
              { conversationId: memoryNudgeConversationId }
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
