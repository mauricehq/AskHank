import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/roles";
import type { Id } from "./_generated/dataModel";

export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").order("desc").collect();
    return users.map((u) => ({
      _id: u._id,
      email: u.email,
      displayName: u.displayName,
      role: u.role ?? "normal",
      _creationTime: u._creationTime,
    }));
  },
});

export const setUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(
      v.literal("normal"),
      v.literal("insider"),
      v.literal("admin")
    ),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    if (admin._id === args.userId) {
      throw new Error("Cannot change your own role.");
    }

    const target = await ctx.db.get(args.userId);
    if (!target) {
      throw new Error("User not found.");
    }

    // Prevent demoting the last admin
    if (target.role === "admin" && args.role !== "admin") {
      const allUsers = await ctx.db.query("users").collect();
      const adminCount = allUsers.filter((u) => u.role === "admin").length;
      if (adminCount <= 1) {
        throw new Error("Cannot demote the last admin.");
      }
    }

    await ctx.db.patch(args.userId, {
      role: args.role,
      updatedAt: Date.now(),
    });
  },
});

export const listConversations = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const conversations = await ctx.db
      .query("conversations")
      .order("desc")
      .take(100);

    // Batch-fetch user display names
    const userIds = [...new Set(conversations.map((c) => c.userId))];
    const users = await Promise.all(userIds.map((id) => ctx.db.get(id)));
    const userMap = new Map<Id<"users">, string>();
    for (const u of users) {
      if (u) userMap.set(u._id, u.displayName || u.email || "Unknown");
    }

    return conversations.map((c) => ({
      _id: c._id,
      userId: c.userId,
      userName: userMap.get(c.userId) ?? "Unknown",
      status: c.status,
      stance: c.stance,
      score: c.score,
      category: c.category,
      estimatedPrice: c.estimatedPrice,
      verdict: c.verdict,
      createdAt: c.createdAt,
    }));
  },
});

export const getConversationMessages = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();
  },
});
