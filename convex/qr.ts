import { mutation } from "./_generated/server";
import { v } from "convex/values";

// ─── Scan QR ───────────────────────────────────────
export const scan = mutation({
  args: {
    guestId: v.id("guests"),
    eventId: v.id("events"),
    scannedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const guest = await ctx.db.get(args.guestId);
    if (!guest || guest.eventId !== args.eventId) {
      return { status: "INVALID", message: "Invité non trouvé" };
    }

    if (guest.status === "DECLINED") {
      return {
        status: "INVALID",
        message: `${guest.firstName} ${guest.lastName} a décliné`,
        guest: { firstName: guest.firstName, lastName: guest.lastName },
      };
    }

    // Check existing scan
    const existing = await ctx.db
      .query("qrScans")
      .withIndex("by_guest", (q) => q.eq("guestId", args.guestId))
      .first();

    if (existing) {
      return {
        status: "ALREADY_SCANNED",
        message: `${guest.firstName} ${guest.lastName} déjà scanné`,
        guest: { firstName: guest.firstName, lastName: guest.lastName },
      };
    }

    await ctx.db.insert("qrScans", {
      guestId: args.guestId,
      eventId: args.eventId,
      scannedBy: args.scannedBy,
      status: "VALID",
    });

    const rsvp = await ctx.db
      .query("rsvps")
      .withIndex("by_guest", (q) => q.eq("guestId", args.guestId))
      .first();

    return {
      status: "VALID",
      message: `Bienvenue ${guest.firstName} ${guest.lastName} !`,
      guest: {
        firstName: guest.firstName,
        lastName: guest.lastName,
        adultCount: rsvp?.adultCount ?? 1,
        childrenCount: rsvp?.childrenCount ?? 0,
        menuChoice: rsvp?.menuChoice,
      },
    };
  },
});

// ─── Generate QR Token ─────────────────────────────
export const generateQr = mutation({
  args: { guestId: v.id("guests") },
  handler: async (ctx, args) => {
    const token = `qr_${args.guestId}_${Date.now()}`;
    await ctx.db.patch(args.guestId, { qrToken: token });
    return token;
  },
});

// ─── Seed Data ─────────────────────────────────────
export const seed = mutation({
  handler: async (ctx) => {
    // Check if already seeded
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "organisateur@eventflow.test"))
      .first();

    if (existingUser) return { message: "Already seeded" };

    // Create user (password pre-hashed for "password123")
    const userId = await ctx.db.insert("users", {
      email: "organisateur@eventflow.test",
      name: "Marie Dupont",
      password: "$2b$12$WS44EafaVLMMcXk1fddXcOEFkdWphE7BoxntvtU5qTlHMjb5LXHgO",
      role: "ORGANIZER",
      plan: "PREMIUM",
    });

    // Create event (2-day wedding)
    const day1 = new Date("2026-07-15T00:00:00Z").getTime();
    const day2 = new Date("2026-07-16T00:00:00Z").getTime();

    const eventId = await ctx.db.insert("events", {
      slug: "mariage-roxane-et-andre",
      title: "Mariage de Roxane & André",
      type: "MARIAGE",
      dates: [day1, day2],
      description: "Nous avons le plaisir de vous convier à notre union.",
      status: "PUBLISHED",
      visibility: "SEMI_PRIVATE",
      maxGuests: 200,
      userId,
    });

    // Create venues (multiple locations across 2 days)
    await ctx.db.insert("eventVenues", {
      eventId,
      name: "Mairie de Versailles",
      address: "4 Place de Gaulle, 78000 Versailles",
      date: day1,
      startTime: "10:00",
      endTime: "11:30",
      order: 1,
      description: "Cérémonie civile",
    });
    await ctx.db.insert("eventVenues", {
      eventId,
      name: "Château de Versailles — Orangerie",
      address: "Place d'Armes, 78000 Versailles",
      date: day1,
      startTime: "14:00",
      endTime: "23:00",
      order: 2,
      description: "Cérémonie religieuse, cocktail et réception",
    });
    await ctx.db.insert("eventVenues", {
      eventId,
      name: "Château de Versailles — Jardins",
      address: "Place d'Armes, 78000 Versailles",
      date: day2,
      startTime: "11:00",
      endTime: "16:00",
      order: 1,
      description: "Brunch du lendemain",
    });

    // Create theme
    await ctx.db.insert("eventThemes", {
      eventId,
      preset: "mariage",
      entryEffect: "floral_draw",
      ambientEffect: "floating_petals",
      ambientIntensity: 0.6,
      scrollReveal: "stagger_lines",
      soundEnabled: false,
      colorPrimary: "#8B5A6A",
      colorSecondary: "#C48B90",
      colorAccent: "#C9A96E",
      colorBackground: "#FFFDF9",
      colorText: "#3D2428",
      colorSurface: "#FFFFFF",
      colorMuted: "#9B8A8E",
      colorBorder: "#E8DDD5",
      fontDisplay: "Cormorant Garamond",
      fontBody: "Montserrat",
    });

    // Create modules
    const mods = [
      { type: "MOD_INVITE", order: 1, active: true },
      { type: "MOD_RSVP", order: 2, active: true },
      { type: "MOD_MENU", order: 3, active: true },
      { type: "MOD_QR", order: 4, active: true },
      { type: "MOD_PROGRAMME", order: 5, active: true },
      { type: "MOD_CHAT", order: 6, active: false },
      { type: "MOD_GALERIE", order: 7, active: false },
      { type: "MOD_DASHBOARD", order: 8, active: true },
    ];
    for (const m of mods) {
      await ctx.db.insert("eventModules", { eventId, ...m });
    }

    // Create guests
    const guests = [
      { firstName: "Jean", lastName: "Martin", email: "jean.martin@email.fr", group: "Famille", status: "CONFIRMED" },
      { firstName: "Sophie", lastName: "Bernard", email: "sophie.bernard@email.fr", group: "Famille", status: "CONFIRMED" },
      { firstName: "Pierre", lastName: "Dubois", email: "pierre.dubois@email.fr", group: "Amis", status: "CONFIRMED" },
      { firstName: "Isabelle", lastName: "Thomas", email: "isabelle.thomas@email.fr", group: "Amis", status: "DECLINED" },
      { firstName: "François", lastName: "Robert", email: "francois.robert@email.fr", group: "Collègues", status: "CONFIRMED" },
    ];

    for (const g of guests) {
      const gId = await ctx.db.insert("guests", { eventId, ...g });
      if (g.status === "CONFIRMED" || g.status === "DECLINED") {
        await ctx.db.insert("rsvps", {
          guestId: gId,
          presence: g.status === "CONFIRMED",
          adultCount: g.status === "CONFIRMED" ? 2 : 1,
          childrenCount: 0,
          allergies: [],
          message: g.status === "CONFIRMED"
            ? "Nous avons hâte de fêter ce jour avec vous !"
            : "Nous serons de tout cœur avec vous.",
        });
      }
    }

    return { message: "Seed complete!", userId, eventId };
  },
});
