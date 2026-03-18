import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ─── Send Message ──────────────────────────────────
export const send = mutation({
  args: {
    eventId: v.id("events"),
    userId: v.id("users"),
    content: v.string(),
    channel: v.string(),
    type: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("chatMessages", args);
  },
});

// ─── List Messages (real-time!) ────────────────────
export const list = query({
  args: {
    eventId: v.id("events"),
    channel: v.string(),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_event_channel", (q) =>
        q.eq("eventId", args.eventId).eq("channel", args.channel)
      )
      .order("asc")
      .take(100);

    // Enrich with user info
    const result = [];
    for (const msg of messages) {
      const user = await ctx.db.get(msg.userId);
      result.push({
        ...msg,
        user: { id: msg.userId, name: user?.name, image: user?.image },
      });
    }
    return result;
  },
});
