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
    } catch (error) {
      console.error("Webhook processing error:", error);
      // Still return 200 to prevent Stripe retries on business logic errors
    }

    return new Response(null, { status: 200 });
  }),
});

export default http;
