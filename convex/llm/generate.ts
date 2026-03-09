"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { chatCompletion } from "./openrouter";
import { buildSystemPrompt, buildMessages } from "./prompt";

export const respond = internalAction({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    try {
      // Fetch conversation messages
      const messages = await ctx.runQuery(
        internal.conversations.internalGetMessages,
        { conversationId: args.conversationId }
      );

      // Fetch model setting (falls back to DEFAULTS in appSettings)
      const modelId = await ctx.runQuery(
        internal.conversations.internalGetSetting,
        { key: "hank_model" }
      ) as string;

      // Fetch user display name
      const displayName = await ctx.runQuery(
        internal.conversations.internalGetUserName,
        { userId: args.userId }
      );

      // Build prompt and call LLM
      const systemPrompt = buildSystemPrompt(displayName ?? undefined);
      const llmMessages = buildMessages(
        systemPrompt,
        messages.map((m) => ({ role: m.role, content: m.content }))
      );

      const result = await chatCompletion({
        messages: llmMessages,
        modelId,
      });

      // Save Hank's response
      await ctx.runMutation(internal.conversations.saveResponse, {
        conversationId: args.conversationId,
        content: result.content,
      });
    } catch (error) {
      console.error("LLM generation failed:", error);
      await ctx.runMutation(internal.conversations.setError, {
        conversationId: args.conversationId,
      });
    }
  },
});
