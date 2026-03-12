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
  }).index("by_user", ["userId"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    role: v.union(v.literal("user"), v.literal("hank")),
    content: v.string(),
    createdAt: v.number(),
  }).index("by_conversation", ["conversationId", "createdAt"]),

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

    // Tool calling (v2)
    toolCalled: v.optional(v.boolean()),
    toolArguments: v.optional(v.string()),
    toolResult: v.optional(v.string()),
    coalescingOverrides: v.optional(v.string()),

    // Error
    error: v.optional(v.string()),

    createdAt: v.number(),
  })
    .index("by_conversation", ["conversationId", "createdAt"])
    .index("by_message", ["messageId"]),
});
