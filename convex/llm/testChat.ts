"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

export const testChat = internalAction({
  args: {
    conversationId: v.optional(v.id("conversations")),
    message: v.string(),
  },
  handler: async (ctx, args): Promise<{
    conversationId: Id<"conversations">;
    response: string;
    trace: unknown;
  }> => {
    // 1. Find admin user for userId requirement
    const admin = await ctx.runQuery(internal.conversations.internalGetFirstAdmin);
    if (!admin) throw new Error("No admin user found. Create one first.");

    // 2. Create or reuse conversation
    let conversationId = args.conversationId;
    if (!conversationId) {
      conversationId = await ctx.runMutation(
        internal.conversations.createTestConversation,
        { userId: admin._id }
      );
    }

    // 3. Insert user message
    await ctx.runMutation(internal.conversations.insertTestMessage, {
      conversationId,
      content: args.message,
    });

    // 4. Run respond (awaited, not scheduled)
    await ctx.runAction(internal.llm.generate.respond, {
      conversationId,
      userId: admin._id,
    });

    // 5. Read trace
    const trace = await ctx.runQuery(internal.llmTraces.debugDump, {
      conversationId,
    });

    // 6. Extract Hank's latest response
    const lastTurn = trace[trace.length - 1];
    const response = (lastTurn as any)?.hankResponse ?? "(no response)";

    return { conversationId, response, trace };
  },
});
