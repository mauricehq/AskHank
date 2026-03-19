import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

const TOKEN_RE = /^[0-9A-Za-z]{10,22}$/;

function generateToken(length = 22): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes)
    .map((b) => BASE62[b % 62])
    .join("");
}

export const createDecisionCard = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");
    if (conversation.userId !== user._id) throw new Error("Not your conversation");
    if (conversation.status !== "resolved" || !conversation.decision) {
      throw new Error("Conversation is not resolved with a decision");
    }

    // Idempotent: return existing card if already created
    const existing = await ctx.db
      .query("shareCards")
      .withIndex("by_conversation_and_type", (q) =>
        q.eq("conversationId", args.conversationId).eq("cardType", "decision")
      )
      .unique();

    if (existing) return existing.token;

    const token = generateToken();

    await ctx.db.insert("shareCards", {
      token,
      cardType: "decision",
      conversationId: args.conversationId,
      userId: user._id,
      data: {
        decision: conversation.decision,
        item: conversation.item ?? "Unknown item",
        estimatedPrice: conversation.estimatedPrice,
        category: conversation.category,
        reactionText: conversation.reactionText,
        hankScore: conversation.hankScore,
      },
      createdAt: Date.now(),
    });

    return token;
  },
});

export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    if (!TOKEN_RE.test(args.token)) return null;

    const card = await ctx.db
      .query("shareCards")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!card) return null;

    return {
      cardType: card.cardType,
      data: card.data,
      ogImageUrl: card.ogImageUrl,
      downloadImageUrl: card.downloadImageUrl,
      createdAt: card.createdAt,
    };
  },
});

// Authenticated ownership check — use before expensive Puppeteer work
export const verifyOwnership = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    if (!TOKEN_RE.test(args.token)) throw new Error("Invalid token format");

    const user = await requireUser(ctx);

    const card = await ctx.db
      .query("shareCards")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!card) throw new Error("Card not found");
    if (card.userId !== user._id) throw new Error("Not your card");

    return {
      cardType: card.cardType,
      ogImageUrl: card.ogImageUrl,
      downloadImageUrl: card.downloadImageUrl,
    };
  },
});

// Called by the image generation API route after Puppeteer + Blob upload.
// Auth: requires the user to own the card.
export const setImageUrl = mutation({
  args: {
    token: v.string(),
    field: v.union(v.literal("ogImageUrl"), v.literal("downloadImageUrl")),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const card = await ctx.db
      .query("shareCards")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!card) throw new Error("Card not found");
    if (card.userId !== user._id) throw new Error("Not your card");

    if (args.url.length > 2048) {
      throw new Error("URL too long.");
    }

    // Only allow Vercel Blob Storage URLs
    const parsed = new URL(args.url);
    const allowedHosts = ["public.blob.vercel-storage.com"];
    if (!allowedHosts.some((h) => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`))) {
      throw new Error("Invalid image URL: must be a Vercel Blob URL");
    }

    await ctx.db.patch(card._id, { [args.field]: args.url });
  },
});

export const deleteCard = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const card = await ctx.db
      .query("shareCards")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!card) throw new Error("Card not found");
    if (card.userId !== user._id) throw new Error("Not your card");
    await ctx.db.delete(card._id);
  },
});
