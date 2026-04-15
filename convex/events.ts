import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

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
    coverImage: v.optional(v.string()),
    coverVideo: v.optional(v.string()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("events", args);
  },
});

// ─── Create Event with defaults (theme + modules) ─
// Remplace prisma.event.create avec nested include theme/modules.
export const createWithDefaults = mutation({
  args: {
    email: v.string(),
    title: v.string(),
    slug: v.string(),
    type: v.string(),
    dates: v.array(v.number()),
    location: v.optional(v.string()),
    presetId: v.string(),
    modules: v.array(
      v.object({
        type: v.string(),
        order: v.number(),
        active: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (!user) throw new Error("User not found");

    const eventId = await ctx.db.insert("events", {
      slug: args.slug,
      title: args.title,
      type: args.type,
      dates: args.dates,
      location: args.location,
      status: "DRAFT",
      visibility: "SEMI_PRIVATE",
      userId: user._id,
    });

    // Theme avec les defaults du preset
    await ctx.db.insert("eventThemes", {
      eventId,
      preset: args.presetId,
      entryEffect: "fade",
      ambientIntensity: 0.5,
      scrollReveal: "fade-up",
      soundEnabled: false,
      colorPrimary: "#7A3A50",
      colorSecondary: "#C48B90",
      colorAccent: "#D4A574",
      colorBackground: "#FAF7F5",
      colorText: "#3D2428",
      colorSurface: "#FFFFFF",
      colorMuted: "#9B8A8E",
      colorBorder: "#E8DDD5",
      fontDisplay: "Cormorant Garamond",
      fontBody: "Montserrat",
    });

    // Modules par défaut
    for (const m of args.modules) {
      await ctx.db.insert("eventModules", {
        eventId,
        type: m.type,
        order: m.order,
        active: m.active,
      });
    }

    return { id: eventId, slug: args.slug, title: args.title };
  },
});

// ─── Vérifier l'unicité du slug ───────────────────
export const isSlugTaken = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const event = await ctx.db
      .query("events")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    return event !== null;
  },
});

// ─── Compter les events de l'utilisateur (plan-guard) ─
export const countByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (!user) return 0;

    const events = await ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return events.length;
  },
});

// ─── Compter les invités d'un event (plan-guard) ─
export const countGuestsByEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const guests = await ctx.db
      .query("guests")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();
    return guests.length;
  },
});

// ─── Get Public Event by Slug (page [slug]) ─────────
// Retourne tout ce dont la page publique d'invitation a besoin :
// event + theme + modules actifs + user + guestCount + chatMessages +
// guest par inviteToken (optionnel).
export const getPublicBySlug = query({
  args: {
    slug: v.string(),
    inviteToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db
      .query("events")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!event || event.status === "ARCHIVED") return null;

    const [theme, allModules, user, guests, allChatMessages] =
      await Promise.all([
        ctx.db
          .query("eventThemes")
          .withIndex("by_event", (q) => q.eq("eventId", event._id))
          .first(),
        ctx.db
          .query("eventModules")
          .withIndex("by_event", (q) => q.eq("eventId", event._id))
          .collect(),
        ctx.db.get(event.userId),
        ctx.db
          .query("guests")
          .withIndex("by_event", (q) => q.eq("eventId", event._id))
          .collect(),
        ctx.db
          .query("chatMessages")
          .withIndex("by_event_channel", (q) => q.eq("eventId", event._id))
          .collect(),
      ]);

    // Guest par inviteToken si fourni
    let guestInfo: {
      _id: string;
      firstName: string;
      lastName: string;
      email: string | null;
      inviteToken: string;
      hasRsvp: boolean;
      presence: boolean | null;
      qrToken: string | null;
    } | null = null;

    if (args.inviteToken) {
      const guest = await ctx.db
        .query("guests")
        .withIndex("by_invite_token", (q) =>
          q.eq("inviteToken", args.inviteToken)
        )
        .first();

      if (guest && guest.eventId === event._id) {
        const rsvp = await ctx.db
          .query("rsvps")
          .withIndex("by_guest", (q) => q.eq("guestId", guest._id))
          .first();

        guestInfo = {
          _id: guest._id,
          firstName: guest.firstName,
          lastName: guest.lastName,
          email: guest.email ?? null,
          inviteToken: guest.inviteToken!,
          hasRsvp: !!rsvp,
          presence: rsvp?.presence ?? null,
          qrToken: guest.qrToken ?? null,
        };
      }
    }

    // Chat messages triés + reply resolution
    const sortedMessages = allChatMessages.sort(
      (a, b) => a._creationTime - b._creationTime
    );

    return {
      ...event,
      theme,
      modules: allModules
        .filter((m) => m.active)
        .sort((a, b) => a.order - b.order),
      user: { name: user?.name ?? null },
      _count: { guests: guests.length },
      chatMessages: sortedMessages,
      guestInfo,
    };
  },
});

// ─── Update Event (patch) ─────────────────────────
export const update = mutation({
  args: {
    id: v.id("events"),
    email: v.string(),
    title: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.union(v.string(), v.null())),
    location: v.optional(v.union(v.string(), v.null())),
    dates: v.optional(v.array(v.number())),
    type: v.optional(v.string()),
    visibility: v.optional(v.string()),
    password: v.optional(v.union(v.string(), v.null())),
    maxGuests: v.optional(v.number()),
    coverImage: v.optional(v.union(v.string(), v.null())),
    coverVideo: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (!user) throw new Error("User not found");

    const event = await ctx.db.get(args.id);
    if (!event || event.userId !== user._id) {
      throw new Error("Event not found or access denied");
    }

    const { id, email, ...rest } = args;
    void id;
    void email;

    // Nettoyer les null (Convex n'aime pas les null, il veut undefined pour optional)
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined) {
        patch[key] = value === null ? undefined : value;
      }
    }

    await ctx.db.patch(args.id, patch);
    return { success: true };
  },
});

// ─── Delete Event (cascade) ───────────────────────
export const remove = mutation({
  args: { id: v.id("events"), email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (!user) throw new Error("User not found");

    const event = await ctx.db.get(args.id);
    if (!event || event.userId !== user._id) {
      throw new Error("Event not found or access denied");
    }

    // Cascade : supprimer toutes les tables liées
    const [theme, modules, venues, guests, chatMessages] = await Promise.all([
      ctx.db.query("eventThemes").withIndex("by_event", (q) => q.eq("eventId", args.id)).collect(),
      ctx.db.query("eventModules").withIndex("by_event", (q) => q.eq("eventId", args.id)).collect(),
      ctx.db.query("eventVenues").withIndex("by_event", (q) => q.eq("eventId", args.id)).collect(),
      ctx.db.query("guests").withIndex("by_event", (q) => q.eq("eventId", args.id)).collect(),
      ctx.db.query("chatMessages").withIndex("by_event_channel", (q) => q.eq("eventId", args.id)).collect(),
    ]);

    // Supprimer RSVPs de chaque invité
    for (const guest of guests) {
      const rsvps = await ctx.db
        .query("rsvps")
        .withIndex("by_guest", (q) => q.eq("guestId", guest._id))
        .collect();
      for (const r of rsvps) await ctx.db.delete(r._id);
    }

    // Supprimer les rows
    for (const t of theme) await ctx.db.delete(t._id);
    for (const m of modules) await ctx.db.delete(m._id);
    for (const v of venues) await ctx.db.delete(v._id);
    for (const g of guests) await ctx.db.delete(g._id);
    for (const c of chatMessages) await ctx.db.delete(c._id);

    await ctx.db.delete(args.id);
    return { success: true };
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

// ─── Get Event for Admin (page /events/[id]/*) ────
// Retourne event + theme + modules triés + venues + _count guests/chat
// + guestStats (grouped by status) + user.name. Remplace :
//   prisma.event.findUnique({ where: { id, userId }, include: { theme,
//     modules, _count: { guests, chatMessages } } })
// + prisma.guest.groupBy({ by: status, where: { eventId } })
//
// Résout l'utilisateur par email pour éviter les IDs Prisma obsolètes
// dans d'anciennes sessions JWT (cohérent avec getDashboardData).
export const getForAdmin = query({
  args: {
    id: v.id("events"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (!user) return null;

    const event = await ctx.db.get(args.id);
    if (!event || event.userId !== user._id) return null;

    const [theme, modules, venues, guests, chatMessages] = await Promise.all([
      ctx.db
        .query("eventThemes")
        .withIndex("by_event", (q) => q.eq("eventId", event._id))
        .first(),
      ctx.db
        .query("eventModules")
        .withIndex("by_event", (q) => q.eq("eventId", event._id))
        .collect(),
      ctx.db
        .query("eventVenues")
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

    // Stats par statut
    const guestStats: Record<string, number> = {};
    for (const g of guests) {
      guestStats[g.status] = (guestStats[g.status] ?? 0) + 1;
    }

    return {
      ...event,
      theme,
      modules: modules.sort((a, b) => a.order - b.order),
      venues: venues.sort((a, b) => {
        if (a.date !== b.date) return a.date - b.date;
        return a.order - b.order;
      }),
      _count: {
        guests: guests.length,
        chatMessages: chatMessages.length,
      },
      guestStats,
      user: { name: user.name ?? null },
    };
  },
});

// ─── Update Event Status (avec vérif ownership) ──
export const updateStatus = mutation({
  args: {
    id: v.id("events"),
    status: v.string(),
    email: v.optional(v.string()), // Optional : legacy path sans vérif
  },
  handler: async (ctx, args) => {
    if (args.email) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", args.email!))
        .first();
      if (!user) throw new Error("User not found");

      const event = await ctx.db.get(args.id);
      if (!event || event.userId !== user._id) {
        throw new Error("Event not found or access denied");
      }
    }

    await ctx.db.patch(args.id, { status: args.status });
    return { success: true };
  },
});

// ─── List Events for User by Email (API /api/events GET) ──
export const listByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (!user) return [];

    const events = await ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Enrichir avec _count et modules (comme Prisma include _count + modules)
    return Promise.all(
      events.map(async (event) => {
        const [guests, modules] = await Promise.all([
          ctx.db
            .query("guests")
            .withIndex("by_event", (q) => q.eq("eventId", event._id))
            .collect(),
          ctx.db
            .query("eventModules")
            .withIndex("by_event", (q) => q.eq("eventId", event._id))
            .collect(),
        ]);
        return {
          ...event,
          _count: { guests: guests.length },
          modules: modules.filter((m) => m.active),
        };
      })
    );
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
//
// Résout l'utilisateur par email pour éviter les problèmes d'IDs obsolètes
// stockés dans d'anciennes sessions JWT (format Prisma vs format Convex).
// Rétro-compat : accepte aussi userId — le build Next.js de prod pré-migration
// envoie encore userId jusqu'au prochain redéploiement Cloud Run.
export const getDashboardData = query({
  args: {
    email: v.optional(v.string()),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let user: { _id: Id<"users"> } | null = null;

    if (args.email) {
      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", args.email as string))
        .first();
    } else if (args.userId) {
      // Tente de charger par _id. Si ce n'est pas un ID Convex valide
      // (ex : ancien cuid Prisma persisté dans un JWT), ctx.db.get throw → catch.
      try {
        user = await ctx.db.get(args.userId as Id<"users">);
      } catch {
        user = null;
      }
    }

    // Utilisateur introuvable → dashboard vide (évite un crash du server component).
    if (!user) {
      return {
        events: [],
        totalEvents: 0,
        totalGuests: 0,
        publishedEvents: 0,
        confirmedGuests: 0,
        recentRSVPs: [],
      };
    }

    const events = await ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
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
