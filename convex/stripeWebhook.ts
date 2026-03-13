"use node";

import Stripe from "stripe";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY not set");
    _stripe = new Stripe(key);
  }
  return _stripe;
}

export const handleWebhook = internalAction({
  args: {
    body: v.string(),
    signature: v.string(),
  },
  handler: async (ctx, args) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET not set");

    const stripe = getStripe();
    const event = stripe.webhooks.constructEvent(
      args.body,
      args.signature,
      webhookSecret,
    );

    if (event.type !== "checkout.session.completed") return;

    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata;
    if (!metadata?.userId || !metadata?.packId || !metadata?.credits) {
      console.error("Missing metadata on checkout session:", session.id);
      return;
    }

    const credits = parseInt(metadata.credits, 10);
    if (isNaN(credits) || credits <= 0) {
      console.error("Invalid credits metadata:", metadata.credits);
      return;
    }

    await ctx.runMutation(internal.credits.addCredits, {
      userId: metadata.userId as Id<"users">,
      stripeSessionId: session.id,
      packId: metadata.packId,
      credits,
      amountCents: session.amount_total ?? 0,
    });
  },
});
