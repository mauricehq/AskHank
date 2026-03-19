import { query } from "./_generated/server";
import { requireUser } from "./lib/auth";

export const listForUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return await ctx.db
      .query("decisionLedger")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});
