"use node";

import Stripe from "stripe";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
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

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const metadata = session.metadata;
          if (!metadata?.userId || !metadata?.packId || !metadata?.credits) {
            console.error("Missing metadata on checkout session:", session.id);
            await ctx.runMutation(internal.credits.logWebhookEvent, {
              eventId: event.id,
              eventType: event.type,
              status: "error",
              error: `Missing metadata on checkout session: ${session.id}`,
            });
            return;
          }

          const credits = parseInt(metadata.credits, 10);
          const expectedPack = CREDIT_PACKS[metadata.packId as PackId];
          if (isNaN(credits) || credits <= 0 || !expectedPack || credits !== expectedPack.credits) {
            console.error("Invalid or mismatched credits metadata:", metadata.credits, metadata.packId);
            await ctx.runMutation(internal.credits.logWebhookEvent, {
              eventId: event.id,
              eventType: event.type,
              status: "error",
              error: `Invalid or mismatched credits metadata: credits=${metadata.credits} packId=${metadata.packId}`,
            });
            return;
          }

          const userId = metadata.userId as Id<"users">;

          await ctx.runMutation(internal.credits.addCredits, {
            userId,
            stripeSessionId: session.id,
            packId: metadata.packId,
            credits,
            amountCents: session.amount_total ?? 0,
          });

          // Backfill paymentIntentId so refunds can find this purchase
          if (session.payment_intent) {
            const piId = typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent.id;
            await ctx.runMutation(internal.credits.setPaymentIntentId, {
              stripeSessionId: session.id,
              paymentIntentId: piId,
            });
          }

          // Belt + suspenders: capture stripeCustomerId if not already saved
          if (session.customer) {
            const customerId = typeof session.customer === "string"
              ? session.customer
              : session.customer.id;
            await ctx.runMutation(internal.credits.setStripeCustomerId, {
              userId,
              stripeCustomerId: customerId,
            });
          }

          await ctx.runMutation(internal.credits.logWebhookEvent, {
            eventId: event.id,
            eventType: event.type,
            status: "processed",
          });
          break;
        }

        case "charge.refunded": {
          const charge = event.data.object as Stripe.Charge;
          const paymentIntentId = typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : charge.payment_intent?.id;

          if (!paymentIntentId) {
            await ctx.runMutation(internal.credits.logWebhookEvent, {
              eventId: event.id,
              eventType: event.type,
              status: "error",
              error: "No payment_intent on charge",
            });
            return;
          }

          await ctx.runMutation(internal.credits.deductCredits, {
            paymentIntentId,
            eventId: event.id,
            eventType: event.type,
          });
          break;
        }

        default: {
          await ctx.runMutation(internal.credits.logWebhookEvent, {
            eventId: event.id,
            eventType: event.type,
            status: "skipped",
          });
        }
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      console.error(`Webhook error [${event.type}]:`, errorMsg);
      try {
        await ctx.runMutation(internal.credits.logWebhookEvent, {
          eventId: event.id,
          eventType: event.type,
          status: "error",
          error: errorMsg,
        });
      } catch {
        // Best-effort logging — don't mask the original error
      }
      throw e;
    }
  },
});
