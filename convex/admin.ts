import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/roles";

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
