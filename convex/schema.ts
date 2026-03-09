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
});
