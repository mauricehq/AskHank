import { query } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { computeWorkHours } from "./llm/workHours";

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);

    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const savedTotal = user.savedTotal ?? 0;
    const skippedCount = user.skippedCount ?? 0;
    const totalConversations = conversations.length;

    const buyingCount = conversations.filter(
      (c) => c.decision === "buying"
    ).length;

    const totalDecisions = skippedCount + buyingCount;
    const resistanceRate =
      totalDecisions > 0
        ? Math.round((skippedCount / totalDecisions) * 100)
        : null;

    const skippedConversations = conversations.filter(
      (c) => c.decision === "skipping"
    );

    // Biggest save: find the skipped conversation with the highest price
    let biggestSave: { amount: number; item: string | null; date: number } | null = null;
    for (const conv of skippedConversations) {
      const price = conv.estimatedPrice ?? 0;
      if (price > 0 && (biggestSave === null || price > biggestSave.amount)) {
        biggestSave = { amount: price, item: conv.item ?? null, date: conv.createdAt };
      }
    }

    // Current streak: count consecutive skipped from most recent backward
    const sorted = [...conversations].sort(
      (a, b) => b.createdAt - a.createdAt
    );
    let currentStreak = 0;
    for (const conv of sorted) {
      if (!conv.decision) continue; // skip active conversations
      if (conv.decision === "skipping") {
        currentStreak++;
      } else {
        break;
      }
    }

    // Category breakdown: top 5 from skipped conversations, with total saved amount
    const categoryData = new Map<string, { count: number; amount: number }>();
    for (const conv of skippedConversations) {
      if (conv.category) {
        const existing = categoryData.get(conv.category) ?? { count: 0, amount: 0 };
        existing.count++;
        existing.amount += conv.estimatedPrice ?? 0;
        categoryData.set(conv.category, existing);
      }
    }
    const categories = [...categoryData.entries()]
      .map(([name, { count, amount }]) => ({ name, count, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Work-hours saved: derive from savedTotal + user's income
    const workHours = computeWorkHours(savedTotal, user.incomeAmount, user.incomeType);
    const hoursSaved = workHours?.hoursEquivalent ?? null;

    return {
      savedTotal,
      skippedCount,
      totalConversations,
      buyingCount,
      resistanceRate,
      biggestSave,
      currentStreak,
      categories,
      hoursSaved,
    };
  },
});
