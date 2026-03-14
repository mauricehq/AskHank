import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function generateToken(length = 10): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes)
    .map((b) => BASE62[b % 62])
    .join("");
}

export const createVerdictCard = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");
    if (conversation.userId !== user._id) throw new Error("Not your conversation");
    if (conversation.status !== "closed" || !conversation.verdict) {
      throw new Error("Conversation is not closed with a verdict");
    }

    // Idempotent: return existing card if already created
    const existing = await ctx.db
      .query("shareCards")
      .withIndex("by_conversation_and_type", (q) =>
        q.eq("conversationId", args.conversationId).eq("cardType", "verdict")
      )
      .unique();

    if (existing) return existing.token;

    const token = generateToken();

    await ctx.db.insert("shareCards", {
      token,
      cardType: "verdict",
      conversationId: args.conversationId,
      userId: user._id,
      data: {
        verdict: conversation.verdict,
        item: conversation.item ?? "Unknown item",
        estimatedPrice: conversation.estimatedPrice,
        category: conversation.category,
        excuse: conversation.excuse ?? "",
        verdictTagline: conversation.verdictTagline,
      },
      createdAt: Date.now(),
    });

    return token;
  },
});

export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
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

    await ctx.db.patch(card._id, { [args.field]: args.url });
  },
});
