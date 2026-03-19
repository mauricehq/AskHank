import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { STARTER_CREDITS } from "./lib/credits";

export const store = mutation({
  args: { timezone: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called store without authentication");
    }

    if (args.timezone && args.timezone.length > 100) {
      throw new Error("Invalid timezone.");
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
    const userId = await ctx.db.insert("users", {
      tokenIdentifier,
      email: identity.email!,
      role: "normal",
      ...(args.timezone ? { timezone: args.timezone } : {}),
      updatedAt: Date.now(),
    });

    // Initialize starter credits (atomic — same transaction)
    await ctx.db.insert("credits", {
      userId,
      balance: STARTER_CREDITS,
      totalPurchased: 0,
      totalUsed: 0,
    });

    return userId;
  },
});

export const setDisplayName = mutation({
  args: { displayName: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called setDisplayName without authentication");
    }

    const displayName = args.displayName.replace(/[\n\r]/g, " ").trim();
    if (displayName.length === 0 || displayName.length > 50) {
      throw new Error("Display name must be 1-50 characters.");
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
      displayName,
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

    if (args.incomeAmount <= 0 || args.incomeAmount > 10_000_000) {
      throw new Error("Income must be between $0 and $10,000,000.");
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

    // Delete conversations and their messages
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const conv of conversations) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
        .collect();
      for (const msg of messages) {
        await ctx.db.delete(msg._id);
      }
      // Delete LLM traces for this conversation
      const traces = await ctx.db
        .query("llmTraces")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
        .collect();
      for (const trace of traces) {
        await ctx.db.delete(trace._id);
      }
      // Delete decision ledger entries for this conversation
      const ledgerEntries = await ctx.db
        .query("decisionLedger")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
        .collect();
      for (const entry of ledgerEntries) {
        await ctx.db.delete(entry._id);
      }
      // Delete share cards for this conversation
      const shareCards = await ctx.db
        .query("shareCards")
        .withIndex("by_conversation_and_type", (q) => q.eq("conversationId", conv._id))
        .collect();
      for (const card of shareCards) {
        await ctx.db.delete(card._id);
      }
      await ctx.db.delete(conv._id);
    }

    // Delete any user-level share cards (not tied to a conversation)
    const userShareCards = await ctx.db
      .query("shareCards")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const card of userShareCards) {
      await ctx.db.delete(card._id);
    }

    // Delete credits row
    const credits = await ctx.db
      .query("credits")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (credits) await ctx.db.delete(credits._id);

    // Delete purchase records
    const purchases = await ctx.db
      .query("purchases")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const p of purchases) {
      await ctx.db.delete(p._id);
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
