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
    deniedCount: v.optional(v.number()),
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
      v.literal("closed")
    ),
    createdAt: v.number(),
    // Phase 2b: Scoring engine fields
    stance: v.optional(v.string()),
    score: v.optional(v.number()),
    category: v.optional(v.string()),
    estimatedPrice: v.optional(v.number()),
    item: v.optional(v.string()),
    lastAssessment: v.optional(v.string()),
    disengagementCount: v.number(),
    stagnationCount: v.number(),
    verdict: v.optional(v.union(v.literal("approved"), v.literal("denied"))),
    verdictSummary: v.optional(v.string()),
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

    // Scores
    rawScores: v.string(),
    sanitizedScores: v.string(),
    scoringResult: v.string(),

    // Stance
    previousStance: v.string(),
    newStance: v.string(),

    // Decision
    decisionType: v.string(),
    category: v.optional(v.string()),
    estimatedPrice: v.optional(v.number()),
    disengagementCount: v.number(),
    stagnationCount: v.number(),

    // Metrics
    tokenUsage: v.object({
      promptTokens: v.number(),
      completionTokens: v.number(),
      totalTokens: v.number(),
    }),
    durationMs: v.number(),

    // Call 2 prompt swap (opener/closer)
    call2SystemPrompt: v.optional(v.string()),

    // Call 3 verdict summary trace
    call3SystemPrompt: v.optional(v.string()),
    call3RawResponse: v.optional(v.string()),

    // Tool calling (v2)
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
    verdict: v.union(v.literal("approved"), v.literal("denied")),
    verdictSummary: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_conversation", ["conversationId"]),

  shareCards: defineTable({
    token: v.string(),
    cardType: v.union(
      v.literal("verdict"),
      v.literal("roast"),
      v.literal("savedTotal")
    ),
    conversationId: v.optional(v.id("conversations")),
    userId: v.id("users"),
    data: v.union(
      v.object({
        verdict: v.union(v.literal("approved"), v.literal("denied")),
        item: v.string(),
        estimatedPrice: v.optional(v.number()),
        category: v.optional(v.string()),
        verdictSummary: v.optional(v.string()),
      }),
      v.object({
        bestQuote: v.string(),
        item: v.string(),
        verdict: v.union(v.literal("approved"), v.literal("denied")),
      }),
      v.object({
        savedTotal: v.number(),
        deniedCount: v.number(),
        approvedCount: v.number(),
      })
    ),
    ogImageUrl: v.optional(v.string()),
    downloadImageUrl: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_conversation_and_type", ["conversationId", "cardType"])
    .index("by_user", ["userId"]),

  webhookLogs: defineTable({
    eventId: v.string(),
    eventType: v.string(),
    status: v.union(v.literal("processed"), v.literal("skipped"), v.literal("error")),
    error: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_event", ["eventId"]),
});
