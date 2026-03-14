import { v } from "convex/values";
import { query, internalMutation, internalQuery } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { STARTER_CREDITS } from "./lib/credits";

// --- Public queries ---

export const getBalance = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { balance: 0, totalPurchased: 0, totalUsed: 0 };

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return { balance: 0, totalPurchased: 0, totalUsed: 0 };

    const credits = await ctx.db
      .query("credits")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    if (!credits) return { balance: 0, totalPurchased: 0, totalUsed: 0 };

    return {
      balance: credits.balance,
      totalPurchased: credits.totalPurchased,
      totalUsed: credits.totalUsed,
    };
  },
});

export const getPurchaseHistory = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const purchases = await ctx.db
      .query("purchases")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Sort by createdAt descending, take last 20
    purchases.sort((a, b) => b.createdAt - a.createdAt);
    return purchases.slice(0, 20);
  },
});

// --- Internal mutations/queries (called by Stripe webhook + user creation) ---

export const addCredits = internalMutation({
  args: {
    userId: v.id("users"),
    stripeSessionId: v.string(),
    packId: v.string(),
    credits: v.number(),
    amountCents: v.number(),
  },
  handler: async (ctx, args) => {
    // Idempotency check: skip if this stripeSessionId already processed
    const existing = await ctx.db
      .query("purchases")
      .withIndex("by_stripe_session", (q) => q.eq("stripeSessionId", args.stripeSessionId))
      .unique();
    if (existing) return;

    // Insert purchase record
    await ctx.db.insert("purchases", {
      userId: args.userId,
      stripeSessionId: args.stripeSessionId,
      packId: args.packId,
      credits: args.credits,
      amountCents: args.amountCents,
      createdAt: Date.now(),
    });

    // Update credits balance
    const creditsRow = await ctx.db
      .query("credits")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    if (creditsRow) {
      await ctx.db.patch(creditsRow._id, {
        balance: creditsRow.balance + args.credits,
        totalPurchased: creditsRow.totalPurchased + args.credits,
      });
    } else {
      // Edge case: credits row doesn't exist yet (pre-Phase 4 user)
      await ctx.db.insert("credits", {
        userId: args.userId,
        balance: args.credits,
        totalPurchased: args.credits,
        totalUsed: 0,
      });
    }
  },
});

export const getUserByToken = internalQuery({
  args: { tokenIdentifier: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.tokenIdentifier))
      .unique();
  },
});

export const setStripeCustomerId = internalMutation({
  args: {
    userId: v.id("users"),
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      stripeCustomerId: args.stripeCustomerId,
    });
  },
});

// --- Webhook logging ---

export const logWebhookEvent = internalMutation({
  args: {
    eventId: v.string(),
    eventType: v.string(),
    status: v.union(v.literal("processed"), v.literal("skipped"), v.literal("error")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Idempotent: skip if eventId already logged
    const existing = await ctx.db
      .query("webhookLogs")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .unique();
    if (existing) return;

    await ctx.db.insert("webhookLogs", {
      eventId: args.eventId,
      eventType: args.eventType,
      status: args.status,
      error: args.error,
      createdAt: Date.now(),
    });
  },
});

// --- Refund handling ---

export const deductCredits = internalMutation({
  args: {
    paymentIntentId: v.string(),
    eventId: v.string(),
    eventType: v.string(),
  },
  handler: async (ctx, args) => {
    // Idempotency: skip if already successfully processed
    const existingLog = await ctx.db
      .query("webhookLogs")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .first();
    if (existingLog?.status === "processed") return;

    // Find purchase by paymentIntentId first, fall back to stripeSessionId
    let purchase = await ctx.db
      .query("purchases")
      .withIndex("by_payment_intent", (q) => q.eq("paymentIntentId", args.paymentIntentId))
      .first();
    if (!purchase) {
      purchase = await ctx.db
        .query("purchases")
        .withIndex("by_stripe_session", (q) => q.eq("stripeSessionId", args.paymentIntentId))
        .first();
    }

    if (!purchase) {
      // Log as skipped — event received but no matching purchase to refund
      if (existingLog) {
        await ctx.db.patch(existingLog._id, { status: "skipped", error: "No matching purchase found" });
      } else {
        await ctx.db.insert("webhookLogs", {
          eventId: args.eventId, eventType: args.eventType,
          status: "skipped", error: "No matching purchase found",
          createdAt: Date.now(),
        });
      }
      return;
    }

    // Deduct credits, clamped at 0
    const creditsRow = await ctx.db
      .query("credits")
      .withIndex("by_user", (q) => q.eq("userId", purchase.userId))
      .unique();
    if (creditsRow) {
      await ctx.db.patch(creditsRow._id, {
        balance: Math.max(0, creditsRow.balance - purchase.credits),
      });
    }

    // Log as processed — atomic with the deduction above
    if (existingLog) {
      await ctx.db.patch(existingLog._id, { status: "processed", error: undefined });
    } else {
      await ctx.db.insert("webhookLogs", {
        eventId: args.eventId, eventType: args.eventType,
        status: "processed", createdAt: Date.now(),
      });
    }
  },
});

export const setPaymentIntentId = internalMutation({
  args: {
    stripeSessionId: v.string(),
    paymentIntentId: v.string(),
  },
  handler: async (ctx, args) => {
    const purchase = await ctx.db
      .query("purchases")
      .withIndex("by_stripe_session", (q) => q.eq("stripeSessionId", args.stripeSessionId))
      .unique();
    if (purchase) {
      await ctx.db.patch(purchase._id, {
        paymentIntentId: args.paymentIntentId,
      });
    }
  },
});

// --- One-time migration: grant starter credits to existing users ---

export const migrateExistingUsers = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    let migrated = 0;
    for (const user of users) {
      const existing = await ctx.db
        .query("credits")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .unique();
      if (!existing) {
        await ctx.db.insert("credits", {
          userId: user._id,
          balance: STARTER_CREDITS,
          totalPurchased: 0,
          totalUsed: 0,
        });
        migrated++;
      }
    }
    return { migrated };
  },
});
