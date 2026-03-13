import { query } from "./_generated/server";
import { requireUser } from "./lib/auth";

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

    const biggestSave =
      deniedConversations.length > 0
        ? Math.max(
            ...deniedConversations.map((c) => c.estimatedPrice ?? 0)
          ) || null
        : null;

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

    // Category breakdown: top 5 from denied conversations
    const categoryCounts = new Map<string, number>();
    for (const conv of deniedConversations) {
      if (conv.category) {
        categoryCounts.set(
          conv.category,
          (categoryCounts.get(conv.category) ?? 0) + 1
        );
      }
    }
    const categories = [...categoryCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      savedTotal,
      deniedCount,
      totalConversations,
      approvedCount,
      resistanceRate,
      biggestSave,
      currentStreak,
      categories,
    };
  },
});
