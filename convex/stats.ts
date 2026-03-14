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
    const deniedCount = user.deniedCount ?? 0;
    const totalConversations = conversations.length;

    const approvedCount = conversations.filter(
      (c) => c.verdict === "approved"
    ).length;

    const totalVerdicts = deniedCount + approvedCount;
    const resistanceRate =
      totalVerdicts > 0
        ? Math.round((deniedCount / totalVerdicts) * 100)
        : null;

    const deniedConversations = conversations.filter(
      (c) => c.verdict === "denied"
    );

    // Biggest save: find the denied conversation with the highest price
    let biggestSave: { amount: number; item: string | null; date: number } | null = null;
    for (const conv of deniedConversations) {
      const price = conv.estimatedPrice ?? 0;
      if (price > 0 && (biggestSave === null || price > biggestSave.amount)) {
        biggestSave = { amount: price, item: conv.item ?? null, date: conv.createdAt };
      }
    }

    // Current streak: count consecutive denied from most recent backward
    const sorted = [...conversations].sort(
      (a, b) => b.createdAt - a.createdAt
    );
    let currentStreak = 0;
    for (const conv of sorted) {
      if (!conv.verdict) continue; // skip active conversations
      if (conv.verdict === "denied") {
        currentStreak++;
      } else {
        break;
      }
    }

    // Category breakdown: top 5 from denied conversations, with total saved amount
    const categoryData = new Map<string, { count: number; amount: number }>();
    for (const conv of deniedConversations) {
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
      deniedCount,
      totalConversations,
      approvedCount,
      resistanceRate,
      biggestSave,
      currentStreak,
      categories,
      hoursSaved,
    };
  },
});
