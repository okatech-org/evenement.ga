import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ─── Update Modules (Batch) ────────────────────────
export const updateBatch = mutation({
  args: {
    eventId: v.id("events"),
    modules: v.array(
      v.object({
        type: v.string(),
        active: v.boolean(),
        order: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const mod of args.modules) {
      const existing = await ctx.db
        .query("eventModules")
        .withIndex("by_event_type", (q) =>
          q.eq("eventId", args.eventId).eq("type", mod.type)
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          active: mod.active,
          order: mod.order,
        });
      } else {
        await ctx.db.insert("eventModules", {
          eventId: args.eventId,
          type: mod.type,
          active: mod.active,
          order: mod.order,
        });
      }
    }
  },
});

// ─── List Modules by Event ─────────────────────────
export const listByEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const modules = await ctx.db
      .query("eventModules")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();
    return modules.sort((a, b) => a.order - b.order);
  },
});
