import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const store = mutation({
  args: { timezone: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called store without authentication");
    }

    const tokenIdentifier = identity.tokenIdentifier;
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
      .unique();

    if (user !== null) {
      // Update existing user if profile or timezone changed
      const needsPatch =
        user.email !== identity.email ||
        (args.timezone && user.timezone !== args.timezone);
      if (needsPatch) {
        await ctx.db.patch(user._id, {
          ...(user.email !== identity.email ? { email: identity.email! } : {}),
          ...(args.timezone && user.timezone !== args.timezone ? { timezone: args.timezone } : {}),
          updatedAt: Date.now(),
        });
      }
      return user._id;
    }

    // Create new user
    return await ctx.db.insert("users", {
      tokenIdentifier,
      email: identity.email!,
      role: "normal",
      ...(args.timezone ? { timezone: args.timezone } : {}),
      updatedAt: Date.now(),
    });
  },
});

export const setDisplayName = mutation({
  args: { displayName: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called setDisplayName without authentication");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      displayName: args.displayName,
      updatedAt: Date.now(),
    });
  },
});

export const setIncome = mutation({
  args: {
    incomeAmount: v.number(),
    incomeType: v.union(v.literal("hourly"), v.literal("annual")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called setIncome without authentication");
    }

    if (args.incomeAmount <= 0) {
      throw new Error("Income must be a positive number");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      incomeAmount: args.incomeAmount,
      incomeType: args.incomeType,
      updatedAt: Date.now(),
    });
  },
});

export const clearIncome = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called clearIncome without authentication");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      incomeAmount: undefined,
      incomeType: undefined,
      updatedAt: Date.now(),
    });
  },
});

export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called deleteAccount without authentication");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.delete(user._id);
  },
});

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    return await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();
  },
});
