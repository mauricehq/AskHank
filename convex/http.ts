import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

const http = httpRouter();

http.route({
  path: "/stripe-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature") ?? "";

    try {
      await ctx.runAction(internal.stripeWebhook.handleWebhook, {
        body,
        signature,
      });
      return new Response(null, { status: 200 });
    } catch (error) {
      console.error("Webhook processing error:", error);
      // Business logic errors (bad metadata, unknown events) are handled
      // inside handleWebhook and return cleanly — they never reach here.
      // Errors that propagate are signature failures or transient issues
      // (DB outage, network), so return 500 to let Stripe retry.
      // Idempotency guards in addCredits prevent duplicate grants on retry.
      return new Response("Webhook processing failed", { status: 500 });
    }
  }),
});

export default http;
