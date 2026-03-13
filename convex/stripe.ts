"use node";

import Stripe from "stripe";
import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { CREDIT_PACKS, type PackId } from "./lib/credits";

let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY not set");
    _stripe = new Stripe(key);
  }
  return _stripe;
}

const PRICE_ENV_MAP: Record<PackId, string> = {
  small: "STRIPE_PRICE_SMALL",
  medium: "STRIPE_PRICE_MEDIUM",
  large: "STRIPE_PRICE_LARGE",
};

export const createCheckoutSession = action({
  args: { packId: v.string() },
  handler: async (ctx, args): Promise<{ url: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const packId = args.packId as PackId;
    const pack = CREDIT_PACKS[packId];
    if (!pack) throw new Error("Invalid pack ID");

    // Look up user
    const user = await ctx.runQuery(internal.credits.getUserByToken, {
      tokenIdentifier: identity.tokenIdentifier,
    });
    if (!user) throw new Error("User not found");

    const priceId = process.env[PRICE_ENV_MAP[packId]];
    if (!priceId) throw new Error(`Stripe price not configured for pack: ${packId}`);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}?credits=success`,
      cancel_url: `${appUrl}?credits=cancelled`,
      metadata: {
        userId: user._id,
        packId,
        credits: String(pack.credits),
      },
    });

    if (!session.url) throw new Error("Stripe did not return a checkout URL");

    return { url: session.url };
  },
});
