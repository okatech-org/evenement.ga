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

// ─── Dashboard Data (page dashboard principal) ─────
// Retourne tout ce dont la page dashboard a besoin en une seule query :
// events (avec theme, modules actifs, counts), stats agrégées, RSVPs récentes.
export const getDashboardData = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Enrichir chaque event avec theme, modules actifs, guestCount, chatCount
    const eventsWithRelations = await Promise.all(
      events.map(async (event) => {
        const [theme, modules, guests, chatMessages] = await Promise.all([
          ctx.db
            .query("eventThemes")
            .withIndex("by_event", (q) => q.eq("eventId", event._id))
            .first(),
          ctx.db
            .query("eventModules")
            .withIndex("by_event", (q) => q.eq("eventId", event._id))
            .collect(),
          ctx.db
            .query("guests")
            .withIndex("by_event", (q) => q.eq("eventId", event._id))
            .collect(),
          ctx.db
            .query("chatMessages")
            .withIndex("by_event_channel", (q) => q.eq("eventId", event._id))
            .collect(),
        ]);

        return {
          ...event,
          theme,
          modules: modules.filter((m) => m.active),
          _count: {
            guests: guests.length,
            chatMessages: chatMessages.length,
          },
        };
      })
    );

    // Trier par première date ascendante
    eventsWithRelations.sort((a, b) => {
      const ad = a.dates[0] ?? 0;
      const bd = b.dates[0] ?? 0;
      return ad - bd;
    });

    // Stats agrégées
    const totalEvents = eventsWithRelations.length;
    const totalGuests = eventsWithRelations.reduce(
      (acc, e) => acc + e._count.guests,
      0
    );
    const publishedEvents = eventsWithRelations.filter(
      (e) => e.status === "PUBLISHED"
    ).length;

    // Compter les invités confirmés (CONFIRMED)
    let confirmedGuests = 0;
    for (const event of events) {
      const guests = await ctx.db
        .query("guests")
        .withIndex("by_event", (q) => q.eq("eventId", event._id))
        .collect();
      confirmedGuests += guests.filter((g) => g.status === "CONFIRMED").length;
    }

    // RSVPs récentes (5 dernières) avec guest + event
    const allRsvps: Array<{
      _id: string;
      _creationTime: number;
      guestId: string;
      presence: boolean;
      adultCount: number;
      childrenCount: number;
      menuChoice?: string;
      allergies: string[];
      message?: string;
      guest: {
        firstName: string;
        lastName: string;
        event: { id: string; title: string };
      };
    }> = [];

    for (const event of events) {
      const guests = await ctx.db
        .query("guests")
        .withIndex("by_event", (q) => q.eq("eventId", event._id))
        .collect();

      for (const guest of guests) {
        const rsvp = await ctx.db
          .query("rsvps")
          .withIndex("by_guest", (q) => q.eq("guestId", guest._id))
          .first();
        if (rsvp) {
          allRsvps.push({
            _id: rsvp._id,
            _creationTime: rsvp._creationTime,
            guestId: rsvp.guestId,
            presence: rsvp.presence,
            adultCount: rsvp.adultCount,
            childrenCount: rsvp.childrenCount,
            menuChoice: rsvp.menuChoice,
            allergies: rsvp.allergies,
            message: rsvp.message,
            guest: {
              firstName: guest.firstName,
              lastName: guest.lastName,
              event: { id: event._id, title: event.title },
            },
          });
        }
      }
    }

    // Tri par date de soumission descendante, limiter à 5
    allRsvps.sort((a, b) => b._creationTime - a._creationTime);
    const recentRSVPs = allRsvps.slice(0, 5);

    return {
      events: eventsWithRelations,
      totalEvents,
      totalGuests,
      publishedEvents,
      confirmedGuests,
      recentRSVPs,
    };
  },
});
