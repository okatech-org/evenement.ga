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

// ─── Replace All Venues (atomic upsert) ────────────
// Supprime toutes les venues de l'event et les remplace par la liste fournie.
// Garantit l'ownership via email et s'exécute dans une seule transaction Convex.
export const replaceAll = mutation({
  args: {
    eventId: v.id("events"),
    email: v.string(),
    venues: v.array(
      v.object({
        name: v.string(),
        address: v.string(),
        date: v.number(),
        startTime: v.optional(v.string()),
        endTime: v.optional(v.string()),
        order: v.number(),
        description: v.optional(v.string()),
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

    // Supprimer l'existant
    const existing = await ctx.db
      .query("eventVenues")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();
    for (const venue of existing) {
      await ctx.db.delete(venue._id);
    }

    // Insérer la nouvelle liste
    for (const venue of args.venues) {
      if (!venue.name || !venue.address) continue; // filtre défensif
      await ctx.db.insert("eventVenues", {
        eventId: args.eventId,
        name: venue.name,
        address: venue.address,
        date: venue.date,
        startTime: venue.startTime,
        endTime: venue.endTime,
        order: venue.order,
        description: venue.description,
      });
    }

    return { success: true, count: args.venues.length };
  },
});
