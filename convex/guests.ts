import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Guests — CRUD opérations (remplace prisma.guest.*)
 * Les queries RSVP (listGuests avec rsvp include) sont dans convex/rsvp.ts.
 */

// ─── List Guests for Event (admin) ─────────────────
// Équivalent prisma.guest.findMany({ where: { eventId }, include: { rsvp } })
export const listByEvent = query({
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

// ─── Create Guest ──────────────────────────────────
// Vérifie l'ownership de l'event via email.
export const create = mutation({
  args: {
    eventId: v.id("events"),
    email: v.string(), // email de l'utilisateur (pour ownership)
    firstName: v.string(),
    lastName: v.string(),
    guestEmail: v.optional(v.string()),
    phone: v.optional(v.string()),
    group: v.optional(v.string()),
    inviteToken: v.string(),
    qrToken: v.optional(v.string()),
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

    const id = await ctx.db.insert("guests", {
      eventId: args.eventId,
      firstName: args.firstName,
      lastName: args.lastName,
      email: args.guestEmail,
      phone: args.phone,
      group: args.group,
      status: "INVITED",
      inviteToken: args.inviteToken,
      qrToken: args.qrToken,
    });

    const guest = await ctx.db.get(id);
    return guest;
  },
});

// ─── Delete Guest ──────────────────────────────────
// Cascade RSVPs associés. Vérifie ownership via email.
export const remove = mutation({
  args: {
    guestId: v.id("guests"),
    eventId: v.id("events"),
    email: v.string(),
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

    const guest = await ctx.db.get(args.guestId);
    if (!guest || guest.eventId !== args.eventId) {
      throw new Error("Guest not found");
    }

    // Supprimer RSVP associé si présent
    const rsvps = await ctx.db
      .query("rsvps")
      .withIndex("by_guest", (q) => q.eq("guestId", args.guestId))
      .collect();
    for (const r of rsvps) await ctx.db.delete(r._id);

    await ctx.db.delete(args.guestId);
    return { success: true };
  },
});

// ─── Get Guest by Invite Token ─────────────────────
export const getByInviteToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("guests")
      .withIndex("by_invite_token", (q) => q.eq("inviteToken", args.token))
      .first();
  },
});
