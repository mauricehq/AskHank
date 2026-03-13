import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { STARTER_CREDITS } from "./lib/credits";

export const store = mutation({
  args: {},
  handler: async (ctx) => {
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
      // Update existing user if profile changed
      if (user.email !== identity.email) {
        await ctx.db.patch(user._id, {
          email: identity.email!,
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
