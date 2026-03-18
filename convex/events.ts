import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ─── Create Event ──────────────────────────────────
export const create = mutation({
  args: {
    slug: v.string(),
    title: v.string(),
    type: v.string(),
    dates: v.array(v.number()),
    location: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.string(),
    visibility: v.string(),
    maxGuests: v.optional(v.number()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("events", args);
  },
});

// ─── List Events by User ───────────────────────────
export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

// ─── Get Event by Slug ─────────────────────────────
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("events")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

// ─── Get Event by ID ───────────────────────────────
export const getById = query({
  args: { id: v.id("events") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.id);
  },
});

// ─── Update Event Status ───────────────────────────
export const updateStatus = mutation({
  args: {
    id: v.id("events"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status });
  },
});

// ─── Get Event with Modules, Theme, and Venues ────
export const getFullEvent = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const event = await ctx.db
      .query("events")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!event) return null;

    const theme = await ctx.db
      .query("eventThemes")
      .withIndex("by_event", (q) => q.eq("eventId", event._id))
      .first();

    const modules = await ctx.db
      .query("eventModules")
      .withIndex("by_event", (q) => q.eq("eventId", event._id))
      .collect();

    const venues = await ctx.db
      .query("eventVenues")
      .withIndex("by_event", (q) => q.eq("eventId", event._id))
      .collect();

    const user = await ctx.db.get(event.userId);

    return {
      ...event,
      theme,
      modules: modules.filter((m) => m.active).sort((a, b) => a.order - b.order),
      venues: venues.sort((a, b) => {
        if (a.date !== b.date) return a.date - b.date;
        return a.order - b.order;
      }),
      user: { name: user?.name },
    };
  },
});

// ─── Dashboard Stats ───────────────────────────────
export const getDashboardStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    let totalGuests = 0;
    let confirmedGuests = 0;

    for (const event of events) {
      const guests = await ctx.db
        .query("guests")
        .withIndex("by_event", (q) => q.eq("eventId", event._id))
        .collect();
      totalGuests += guests.length;
      confirmedGuests += guests.filter((g) => g.status === "CONFIRMED").length;
    }

    return {
      totalEvents: events.length,
      publishedEvents: events.filter((e) => e.status === "PUBLISHED").length,
      totalGuests,
      confirmedGuests,
      events,
    };
  },
});
