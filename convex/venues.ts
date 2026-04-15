import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ─── Add Venue ─────────────────────────────────────
export const add = mutation({
  args: {
    eventId: v.id("events"),
    name: v.string(),
    address: v.string(),
    date: v.number(),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    order: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("eventVenues", args);
  },
});

// ─── Update Venue ──────────────────────────────────
export const update = mutation({
  args: {
    id: v.id("eventVenues"),
    name: v.optional(v.string()),
    address: v.optional(v.string()),
    date: v.optional(v.number()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    order: v.optional(v.number()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    const patch: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) patch[key] = val;
    }
    await ctx.db.patch(id, patch);
  },
});

// ─── Remove Venue ──────────────────────────────────
export const remove = mutation({
  args: { id: v.id("eventVenues") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ─── List Venues by Event ──────────────────────────
export const listByEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const venues = await ctx.db
      .query("eventVenues")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();
    return venues.sort((a, b) => {
      if (a.date !== b.date) return a.date - b.date;
      return a.order - b.order;
    });
  },
});
