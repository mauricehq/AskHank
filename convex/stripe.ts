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
  args: { packId: v.union(v.literal("small"), v.literal("medium"), v.literal("large")) },
  handler: async (ctx, args): Promise<{ url: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const pack = CREDIT_PACKS[args.packId];

    // Look up user
    const user = await ctx.runQuery(internal.credits.getUserByToken, {
      tokenIdentifier: identity.tokenIdentifier,
    });
    if (!user) throw new Error("User not found");

    const priceId = process.env[PRICE_ENV_MAP[args.packId]];
    if (!priceId) throw new Error(`Stripe price not configured for pack: ${args.packId}`);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const stripe = getStripe();

    // Create or reuse Stripe Customer
    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user._id },
      });
      stripeCustomerId = customer.id;
      await ctx.runMutation(internal.credits.setStripeCustomerId, {
        userId: user._id,
        stripeCustomerId,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: stripeCustomerId,
      payment_intent_data: {
        setup_future_usage: "on_session",
      },
      saved_payment_method_options: {
        allow_redisplay_filters: ["always", "limited"],
      },
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/conversations?credits=success`,
      cancel_url: `${appUrl}/conversations?credits=cancelled`,
      metadata: {
        userId: user._id,
        packId: args.packId,
        credits: String(pack.credits),
      },
    });

    if (!session.url) throw new Error("Stripe did not return a checkout URL");

    return { url: session.url };
  },
});

export const chargeSavedMethod = action({
  args: { packId: v.union(v.literal("small"), v.literal("medium"), v.literal("large")) },
  handler: async (
    ctx,
    args
  ): Promise<{ success: true } | { requiresCheckout: true }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const pack = CREDIT_PACKS[args.packId];

    const user = await ctx.runQuery(internal.credits.getUserByToken, {
      tokenIdentifier: identity.tokenIdentifier,
    });
    if (!user) throw new Error("User not found");

    if (!user.stripeCustomerId) return { requiresCheckout: true };

    const stripe = getStripe();

    // Check for saved payment methods
    const methods = await stripe.paymentMethods.list({
      customer: user.stripeCustomerId,
      type: "card",
    });
    if (methods.data.length === 0) return { requiresCheckout: true };

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: pack.priceCents,
        currency: "usd",
        customer: user.stripeCustomerId,
        payment_method: methods.data[0].id,
        confirm: true,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: "never",
        },
        metadata: {
          userId: user._id,
          packId: args.packId,
          credits: String(pack.credits),
        },
      });

      if (paymentIntent.status === "succeeded") {
        await ctx.runMutation(internal.credits.addCredits, {
          userId: user._id,
          stripeSessionId: paymentIntent.id,
          packId: args.packId,
          credits: pack.credits,
          amountCents: pack.priceCents,
        });
        return { success: true };
      }

      // Any other status (requires_action, requires_confirmation, etc.)
      return { requiresCheckout: true };
    } catch (e) {
      console.error("Direct charge failed, falling back to checkout:", e);
      return { requiresCheckout: true };
    }
  },
});

export const hasSavedPaymentMethod = action({
  args: {},
  handler: async (ctx): Promise<boolean> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const user = await ctx.runQuery(internal.credits.getUserByToken, {
      tokenIdentifier: identity.tokenIdentifier,
    });
    if (!user?.stripeCustomerId) return false;

    const stripe = getStripe();
    const methods = await stripe.paymentMethods.list({
      customer: user.stripeCustomerId,
      type: "card",
      limit: 1,
    });
    return methods.data.length > 0;
  },
});

export const createPortalSession = action({
  args: {},
  handler: async (ctx): Promise<{ url: string } | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.runQuery(internal.credits.getUserByToken, {
      tokenIdentifier: identity.tokenIdentifier,
    });
    if (!user) throw new Error("User not found");

    if (!user.stripeCustomerId) return null;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const stripe = getStripe();

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${appUrl}/conversations`,
    });

    return { url: portalSession.url };
  },
});
