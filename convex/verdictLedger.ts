import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";
import { requireUser } from "./lib/auth";

export const listForUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return await ctx.db
      .query("verdictLedger")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const backfillFromConversations = internalMutation({
  args: {},
  handler: async (ctx) => {
    const conversations = await ctx.db.query("conversations").collect();
    let inserted = 0;
    for (const c of conversations) {
      if (!c.verdict || !c.item) continue;
      const existing = await ctx.db
        .query("verdictLedger")
        .withIndex("by_conversation", (q) => q.eq("conversationId", c._id))
        .unique();
      if (existing) continue;
      await ctx.db.insert("verdictLedger", {
        userId: c.userId,
        conversationId: c._id,
        item: c.item,
        category: c.category,
        estimatedPrice: c.estimatedPrice,
        verdict: c.verdict,
        verdictSummary: c.verdictSummary,
        createdAt: c.createdAt,
      });
      inserted++;
    }
    console.log(`Backfilled ${inserted} verdict ledger entries`);
  },
});
