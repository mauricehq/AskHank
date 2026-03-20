import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    email: v.string(),
    displayName: v.optional(v.string()),
    role: v.optional(
      v.union(
        v.literal("normal"),
        v.literal("insider"),
        v.literal("admin")
      )
    ),
    stripeCustomerId: v.optional(v.string()),
    timezone: v.optional(v.string()),
    savedTotal: v.optional(v.number()),
    skippedCount: v.optional(v.number()),
    incomeAmount: v.optional(v.number()),
    incomeType: v.optional(v.union(v.literal("hourly"), v.literal("annual"))),
    updatedAt: v.number(),
  }).index("by_token", ["tokenIdentifier"]),

  appSettings: defineTable({
    key: v.string(),
    value: v.any(),
    updatedAt: v.number(),
    updatedBy: v.optional(v.id("users")),
  }).index("by_key", ["key"]),

  conversations: defineTable({
    userId: v.id("users"),
    status: v.union(
      v.literal("active"),
      v.literal("thinking"),
      v.literal("error"),
      v.literal("resolved"),
      v.literal("paused")
    ),
    createdAt: v.number(),
    // v2 engine fields
    intensity: v.optional(v.string()),
    coverageRatio: v.optional(v.number()),
    category: v.optional(v.string()),
    estimatedPrice: v.optional(v.number()),
    item: v.optional(v.string()),
    lastAssessment: v.optional(v.string()),
    consecutiveNonAnswers: v.number(),
    decision: v.optional(
      v.union(v.literal("buying"), v.literal("skipping"), v.literal("thinking"))
    ),
    reactionText: v.optional(v.string()),
    hankScore: v.optional(v.number()),
    outcome: v.optional(v.union(v.literal("purchased"), v.literal("skipped"), v.literal("unknown"))),
    outcomeRecordedAt: v.optional(v.number()),
    memoryReferenceCount: v.optional(v.number()),
    thinkingSince: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    role: v.union(v.literal("user"), v.literal("hank")),
    content: v.string(),
    createdAt: v.number(),
  }).index("by_conversation", ["conversationId", "createdAt"]),

  credits: defineTable({
    userId: v.id("users"),
    balance: v.number(),
    totalPurchased: v.number(),
    totalUsed: v.number(),
  }).index("by_user", ["userId"]),

  purchases: defineTable({
    userId: v.id("users"),
    stripeSessionId: v.string(),
    paymentIntentId: v.optional(v.string()),
    packId: v.string(),
    credits: v.number(),
    amountCents: v.number(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_stripe_session", ["stripeSessionId"])
    .index("by_payment_intent", ["paymentIntentId"]),

  llmTraces: defineTable({
    // Links
    conversationId: v.id("conversations"),
    messageId: v.optional(v.id("messages")),

    // Request
    systemPrompt: v.string(),
    messagesArray: v.string(),
    modelId: v.string(),
    temperature: v.number(),
    maxTokens: v.number(),

    // Response
    rawResponse: v.string(),
    parsedResponse: v.string(),

    // Scores (JSON strings — v2 compass data)
    rawScores: v.string(),
    sanitizedScores: v.string(),
    scoringResult: v.string(),

    // Intensity (v2 — was stance)
    previousIntensity: v.string(),
    newIntensity: v.string(),

    // Decision
    decisionType: v.string(),
    category: v.optional(v.string()),
    estimatedPrice: v.optional(v.number()),
    consecutiveNonAnswers: v.number(),
    turnsSinceCoverageAdvanced: v.number(),

    // Metrics
    tokenUsage: v.object({
      promptTokens: v.number(),
      completionTokens: v.number(),
      totalTokens: v.number(),
    }),
    durationMs: v.number(),

    // Call 2 prompt swap (opener/reaction)
    call2SystemPrompt: v.optional(v.string()),

    // Tool calling
    toolCalled: v.optional(v.boolean()),
    toolArguments: v.optional(v.string()),
    toolResult: v.optional(v.string()),
    coalescingOverrides: v.optional(v.string()),

    // Cost tracking
    estimatedCostUsd: v.optional(v.number()),

    // Error
    error: v.optional(v.string()),

    createdAt: v.number(),
  })
    .index("by_conversation", ["conversationId", "createdAt"])
    .index("by_message", ["messageId"]),

  replayCuts: defineTable({
    conversationId: v.id("conversations"),
    token: v.string(),
    messages: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("hank")),
        content: v.string(),
      })
    ),
    // Denormalized from conversation (replay page needs one query, no auth)
    item: v.string(),
    estimatedPrice: v.optional(v.number()),
    category: v.optional(v.string()),
    decision: v.union(v.literal("buying"), v.literal("skipping"), v.literal("thinking")),
    reactionText: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_conversation", ["conversationId"]),

  shareCards: defineTable({
    token: v.string(),
    cardType: v.union(
      v.literal("decision"),
      v.literal("roast"),
      v.literal("savedTotal")
    ),
    conversationId: v.optional(v.id("conversations")),
    userId: v.id("users"),
    data: v.union(
      v.object({
        decision: v.union(v.literal("buying"), v.literal("skipping"), v.literal("thinking")),
        item: v.string(),
        estimatedPrice: v.optional(v.number()),
        category: v.optional(v.string()),
        reactionText: v.optional(v.string()),
        hankScore: v.optional(v.number()),
      }),
      v.object({
        bestQuote: v.string(),
        item: v.string(),
        decision: v.union(v.literal("buying"), v.literal("skipping"), v.literal("thinking")),
      }),
      v.object({
        savedTotal: v.number(),
        skippedCount: v.number(),
        buyingCount: v.number(),
      })
    ),
    ogImageUrl: v.optional(v.string()),
    downloadImageUrl: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_conversation_and_type", ["conversationId", "cardType"])
    .index("by_user", ["userId"]),

  decisionLedger: defineTable({
    userId: v.id("users"),
    conversationId: v.id("conversations"),
    item: v.string(),
    category: v.optional(v.string()),
    estimatedPrice: v.optional(v.number()),
    decision: v.union(v.literal("buying"), v.literal("skipping"), v.literal("thinking")),
    reactionText: v.optional(v.string()),
    hankScore: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_conversation", ["conversationId"]),

  webhookLogs: defineTable({
    eventId: v.string(),
    eventType: v.string(),
    status: v.union(v.literal("processed"), v.literal("skipped"), v.literal("error")),
    error: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_event", ["eventId"]),
});
