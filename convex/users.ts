import { mutation, query } from "./_generated/server";

export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called store without authentication");
    }

    const tokenIdentifier = identity.tokenIdentifier;
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
      .unique();

    if (user !== null) {
      // Update existing user if profile changed
      if (user.email !== identity.email) {
        await ctx.db.patch(user._id, {
          email: identity.email!,
          updatedAt: Date.now(),
        });
      }
      return user._id;
    }

    // Create new user
    return await ctx.db.insert("users", {
      tokenIdentifier,
      email: identity.email!,
      updatedAt: Date.now(),
    });
  },
});

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    return await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();
  },
});
