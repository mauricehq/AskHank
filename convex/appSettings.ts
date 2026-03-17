import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/roles";

const VALID_KEYS = [
  "hank_model",
  "hank_fallback_model",
  "hank_killswitch",
] as const;

export type AppSettingKey = (typeof VALID_KEYS)[number];

const settingKey = v.union(
  v.literal("hank_model"),
  v.literal("hank_fallback_model"),
  v.literal("hank_killswitch")
);

export const DEFAULTS: Record<string, unknown> = {
  hank_model: "anthropic/claude-haiku-4-5",
  hank_fallback_model: "meta-llama/llama-3.3-70b-instruct:free",
  hank_killswitch: { enabled: false, reason: null },
};

export const get = query({
  args: { key: settingKey },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const row = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    return row?.value ?? DEFAULTS[args.key] ?? null;
  },
});

export const getAll = query({
  args: { keys: v.array(settingKey) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const result: Record<string, unknown> = {};
    for (const key of args.keys) {
      const row = await ctx.db
        .query("appSettings")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique();
      result[key] = row?.value ?? DEFAULTS[key] ?? null;
    }
    return result;
  },
});

export const set = mutation({
  args: { key: settingKey, value: v.any() },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    // Validate value shape per key
    if (args.key === "hank_model" || args.key === "hank_fallback_model") {
      if (typeof args.value !== "string" || args.value.trim() === "") {
        throw new Error(`${args.key} must be a non-empty string.`);
      }
      if (args.value.length > 100) {
        throw new Error(`${args.key} must be at most 100 characters.`);
      }
    } else if (args.key === "hank_killswitch") {
      if (
        typeof args.value !== "object" ||
        args.value === null ||
        typeof args.value.enabled !== "boolean"
      ) {
        throw new Error(
          "hank_killswitch must be { enabled: boolean, reason: string | null }."
        );
      }
      if (typeof args.value.reason === "string" && args.value.reason.length > 500) {
        throw new Error("Killswitch reason must be at most 500 characters.");
      }
    }
    const existing = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        updatedAt: Date.now(),
        updatedBy: admin._id,
      });
    } else {
      await ctx.db.insert("appSettings", {
        key: args.key,
        value: args.value,
        updatedAt: Date.now(),
        updatedBy: admin._id,
      });
    }
  },
});
