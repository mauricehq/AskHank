import { v } from "convex/values";
import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireAdmin } from "./lib/roles";

// ── Shared helpers ──

function validateMessages(messages: { content: string }[]) {
  if (messages.length > 50) {
    throw new Error("Too many messages (max 50).");
  }
  for (const msg of messages) {
    if (msg.content.length > 5000) {
      throw new Error("Message content too long (max 5000 chars).");
    }
  }
}

async function insertCut(
  ctx: MutationCtx,
  args: {
    conversationId: Id<"conversations">;
    messages: { role: "user" | "hank"; content: string }[];
  }
) {
  validateMessages(args.messages);

  const token = crypto.randomUUID();

  // Ensure token uniqueness (collision is astronomically unlikely but guard anyway)
  const existing = await ctx.db
    .query("replayCuts")
    .withIndex("by_token", (q) => q.eq("token", token))
    .first();
  if (existing) throw new Error("Token collision — try again");

  const conversation = await ctx.db.get(args.conversationId);
  if (!conversation) throw new Error("Conversation not found");
  if (!conversation.verdict) throw new Error("Conversation has no verdict");

  await ctx.db.insert("replayCuts", {
    conversationId: args.conversationId,
    token,
    messages: args.messages,
    item: conversation.item ?? "Unknown item",
    estimatedPrice: conversation.estimatedPrice,
    category: conversation.category,
    verdict: conversation.verdict,
    verdictSummary: conversation.verdictSummary,
    createdAt: Date.now(),
  });

  return token;
}

// ── Token validation ──

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LEGACY_RE = /^[a-zA-Z0-9]{8,16}$/;

function isValidToken(token: string): boolean {
  return UUID_RE.test(token) || LEGACY_RE.test(token);
}

// ── Public mutations ──

export const create = mutation({
  args: {
    conversationId: v.id("conversations"),
    messages: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("hank")),
        content: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await insertCut(ctx, args);
  },
});

export const updateMessages = mutation({
  args: {
    cutId: v.id("replayCuts"),
    messages: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("hank")),
        content: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    validateMessages(args.messages);

    const cut = await ctx.db.get(args.cutId);
    if (!cut) throw new Error("Cut not found");

    await ctx.db.patch(args.cutId, { messages: args.messages });
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("replayCuts")
      .order("desc")
      .take(100);
  },
});

export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    if (!isValidToken(args.token)) return null;

    const cut = await ctx.db
      .query("replayCuts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!cut) return null;
    // Only expose what the replay page needs — no internal IDs
    return {
      messages: cut.messages,
      item: cut.item,
      estimatedPrice: cut.estimatedPrice,
      category: cut.category,
      verdict: cut.verdict,
      verdictSummary: cut.verdictSummary,
    };
  },
});

export const deleteCut = mutation({
  args: { cutId: v.id("replayCuts") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const cut = await ctx.db.get(args.cutId);
    if (!cut) throw new Error("Cut not found");

    await ctx.db.delete(args.cutId);
  },
});

// ── Internal functions for CLI use (npx convex run) ──

export const internalCreate = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    messages: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("hank")),
        content: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    return await insertCut(ctx, args);
  },
});

export const internalListConversations = internalQuery({
  args: {},
  handler: async (ctx) => {
    const conversations = await ctx.db
      .query("conversations")
      .order("desc")
      .take(100);
    return conversations.map((c) => ({
      _id: c._id,
      status: c.status,
      item: c.item,
      estimatedPrice: c.estimatedPrice,
      category: c.category,
      verdict: c.verdict,
      createdAt: c.createdAt,
    }));
  },
});

export const internalGetMessages = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();
  },
});
