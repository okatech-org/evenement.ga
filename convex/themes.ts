import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ─── Get Theme ─────────────────────────────────────
export const getByEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("eventThemes")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .first();
  },
});

// ─── Upsert Theme ──────────────────────────────────
export const upsert = mutation({
  args: {
    eventId: v.id("events"),
    preset: v.string(),
    entryEffect: v.string(),
    ambientEffect: v.optional(v.string()),
    ambientIntensity: v.number(),
    scrollReveal: v.string(),
    cursorEffect: v.optional(v.string()),
    soundEnabled: v.boolean(),
    soundUrl: v.optional(v.string()),
    colorPrimary: v.string(),
    colorSecondary: v.string(),
    colorAccent: v.string(),
    colorBackground: v.string(),
    colorText: v.string(),
    colorSurface: v.string(),
    colorMuted: v.string(),
    colorBorder: v.string(),
    fontDisplay: v.string(),
    fontBody: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("eventThemes")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    } else {
      return ctx.db.insert("eventThemes", args);
    }
  },
});
