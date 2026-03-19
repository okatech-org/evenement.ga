import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ─── Get GlobalConfig ──────────────────────────────
export const get = query({
  handler: async (ctx) => {
    return ctx.db
      .query("globalConfig")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .first();
  },
});

// ─── Update GlobalConfig ───────────────────────────
export const update = mutation({
  args: {
    maintenanceMode: v.optional(v.boolean()),
    maintenanceMessage: v.optional(v.string()),
    newRegistrations: v.optional(v.boolean()),
    demoEnabled: v.optional(v.boolean()),
    maxEventsPerUser: v.optional(v.string()),
    maxGuestsPerEvent: v.optional(v.string()),
    featureFlags: v.optional(v.string()),
    updatedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("globalConfig")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .first();

    const patch: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(args)) {
      if (val !== undefined) patch[key] = val;
    }

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    } else {
      return ctx.db.insert("globalConfig", {
        key: "global",
        maintenanceMode: args.maintenanceMode ?? false,
        newRegistrations: args.newRegistrations ?? true,
        demoEnabled: args.demoEnabled ?? true,
        ...patch,
      });
    }
  },
});
