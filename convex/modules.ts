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

// ─── Patch modules by ID (avec ownership via email) ─
// Remplace prisma.eventModule.update pour chaque module en parallèle.
export const patchByIds = mutation({
  args: {
    eventId: v.id("events"),
    email: v.string(),
    modules: v.array(
      v.object({
        id: v.id("eventModules"),
        active: v.optional(v.boolean()),
        order: v.optional(v.number()),
        configJson: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (!user) throw new Error("User not found");

    const event = await ctx.db.get(args.eventId);
    if (!event || event.userId !== user._id) {
      throw new Error("Event not found or access denied");
    }

    for (const mod of args.modules) {
      const existing = await ctx.db.get(mod.id);
      if (!existing || existing.eventId !== args.eventId) continue;

      const patch: Record<string, unknown> = {};
      if (mod.active !== undefined) patch.active = mod.active;
      if (mod.order !== undefined) patch.order = mod.order;
      if (mod.configJson !== undefined) patch.configJson = mod.configJson;

      await ctx.db.patch(mod.id, patch);
    }

    return { success: true };
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
