import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ─── Submit RSVP (Public) ──────────────────────────
export const submit = mutation({
  args: {
    eventId: v.id("events"),
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    presence: v.boolean(),
    adultCount: v.number(),
    childrenCount: v.number(),
    menuChoice: v.optional(v.string()),
    allergies: v.array(v.string()),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find or create guest
    let guest = await ctx.db
      .query("guests")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (guest && guest.eventId !== args.eventId) {
      guest = null; // same email but different event
    }

    const guestId = guest
      ? guest._id
      : await ctx.db.insert("guests", {
          eventId: args.eventId,
          firstName: args.firstName,
          lastName: args.lastName,
          email: args.email,
          status: args.presence ? "CONFIRMED" : "DECLINED",
        });

    if (guest) {
      await ctx.db.patch(guestId, {
        firstName: args.firstName,
        lastName: args.lastName,
        status: args.presence ? "CONFIRMED" : "DECLINED",
      });
    }

    // Upsert RSVP
    const existingRsvp = await ctx.db
      .query("rsvps")
      .withIndex("by_guest", (q) => q.eq("guestId", guestId))
      .first();

    if (existingRsvp) {
      await ctx.db.patch(existingRsvp._id, {
        presence: args.presence,
        adultCount: args.adultCount,
        childrenCount: args.childrenCount,
        menuChoice: args.menuChoice,
        allergies: args.allergies,
        message: args.message,
      });
    } else {
      await ctx.db.insert("rsvps", {
        guestId,
        presence: args.presence,
        adultCount: args.adultCount,
        childrenCount: args.childrenCount,
        menuChoice: args.menuChoice,
        allergies: args.allergies,
        message: args.message,
      });
    }

    return { success: true };
  },
});

// ─── List Guests with RSVPs ────────────────────────
export const listGuests = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const guests = await ctx.db
      .query("guests")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const result = [];
    for (const guest of guests) {
      const rsvp = await ctx.db
        .query("rsvps")
        .withIndex("by_guest", (q) => q.eq("guestId", guest._id))
        .first();
      result.push({ ...guest, rsvp });
    }

    return result;
  },
});
