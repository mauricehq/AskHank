import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    email: v.string(),
    displayName: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_token", ["tokenIdentifier"]),
});
