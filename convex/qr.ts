import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

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

// ─── Scan by token/URL (used by the scan API route) ─────────
export const scanByToken = mutation({
  args: {
    eventId: v.id("events"),
    scannedBy: v.id("users"),
    scannedUrl: v.optional(v.string()),
    inviteToken: v.optional(v.string()),
    qrToken: v.optional(v.string()),
    guestId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // ── Find guest by multiple lookup strategies ──
    let guest = null;

    if (args.guestId) {
      try {
        const found = await ctx.db.get(args.guestId as Id<"guests">);
        if (found && "eventId" in found && found.eventId === args.eventId) {
          guest = found;
        }
      } catch {
        guest = null;
      }
    }

    if (!guest && args.inviteToken) {
      guest = await ctx.db
        .query("guests")
        .withIndex("by_invite_token", (q) => q.eq("inviteToken", args.inviteToken!))
        .first();
      if (guest && guest.eventId !== args.eventId) guest = null;
    }

    if (!guest && args.qrToken) {
      guest = await ctx.db
        .query("guests")
        .withIndex("by_qr_token", (q) => q.eq("qrToken", args.qrToken!))
        .first();
      if (guest && guest.eventId !== args.eventId) guest = null;
    }

    if (!guest && args.scannedUrl) {
      // Parse the scanned URL to extract the token
      const parts = args.scannedUrl.split("/");
      const token = parts[parts.length - 1];
      if (token) {
        // Try inviteToken
        guest = await ctx.db
          .query("guests")
          .withIndex("by_invite_token", (q) => q.eq("inviteToken", token))
          .first();
        // Try qrToken
        if (!guest) {
          guest = await ctx.db
            .query("guests")
            .withIndex("by_qr_token", (q) => q.eq("qrToken", token))
            .first();
        }
        if (guest && guest.eventId !== args.eventId) guest = null;
      }
    }

    if (!guest) {
      return {
        status: "INVALID",
        message: "❌ Invité non trouvé — QR code invalide",
        color: "red",
      };
    }

    // Check status — declined
    if (guest.status === "DECLINED") {
      return {
        status: "DECLINED",
        message: `${guest.firstName} ${guest.lastName} a décliné l'invitation`,
        color: "red",
        guest: {
          firstName: guest.firstName,
          lastName: guest.lastName,
          group: guest.group,
        },
      };
    }

    // Check status — not confirmed
    if (guest.status !== "CONFIRMED") {
      return {
        status: "NOT_CONFIRMED",
        message: `${guest.firstName} ${guest.lastName} — Invitation non confirmée`,
        color: "orange",
        guest: {
          firstName: guest.firstName,
          lastName: guest.lastName,
          group: guest.group,
          status: guest.status,
        },
      };
    }

    // Check if already scanned
    const existingScan = await ctx.db
      .query("qrScans")
      .withIndex("by_guest", (q) => q.eq("guestId", guest!._id))
      .first();

    const rsvp = await ctx.db
      .query("rsvps")
      .withIndex("by_guest", (q) => q.eq("guestId", guest!._id))
      .first();

    if (existingScan) {
      return {
        status: "ALREADY_SCANNED",
        message: `⚠️ ${guest.firstName} ${guest.lastName} — Déjà scanné`,
        color: "orange",
        scannedAt: existingScan._creationTime,
        guest: {
          firstName: guest.firstName,
          lastName: guest.lastName,
          group: guest.group,
          adultCount: rsvp?.adultCount ?? 1,
          childrenCount: rsvp?.childrenCount ?? 0,
          menuChoice: rsvp?.menuChoice,
          allergies: rsvp?.allergies || [],
        },
      };
    }

    // ── Create scan record — VALID ──
    await ctx.db.insert("qrScans", {
      guestId: guest._id,
      eventId: args.eventId,
      scannedBy: args.scannedBy,
      status: "VALID",
    });

    return {
      status: "VALID",
      message: `✅ Bienvenue ${guest.firstName} ${guest.lastName} !`,
      color: "green",
      scannedAt: Date.now(),
      guest: {
        firstName: guest.firstName,
        lastName: guest.lastName,
        group: guest.group,
        adultCount: rsvp?.adultCount ?? 1,
        childrenCount: rsvp?.childrenCount ?? 0,
        menuChoice: rsvp?.menuChoice,
        allergies: rsvp?.allergies || [],
      },
    };
  },
});

// ─── Scan History (query) ─────────────────────────────
export const scanHistory = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const scans = await ctx.db
      .query("qrScans")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .order("desc")
      .take(50);

    const totalConfirmed = (
      await ctx.db
        .query("guests")
        .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
        .collect()
    ).filter((g) => g.status === "CONFIRMED").length;

    const enriched = await Promise.all(
      scans.map(async (scan) => {
        const guest = await ctx.db.get(scan.guestId);
        const rsvp = guest
          ? await ctx.db
              .query("rsvps")
              .withIndex("by_guest", (q) => q.eq("guestId", guest._id))
              .first()
          : null;
        return {
          id: scan._id,
          guestName: guest ? `${guest.firstName} ${guest.lastName}` : "Inconnu",
          group: guest?.group ?? null,
          adultCount: rsvp?.adultCount ?? 1,
          childrenCount: rsvp?.childrenCount ?? 0,
          menuChoice: rsvp?.menuChoice ?? null,
          scannedAt: new Date(scan._creationTime).toISOString(),
          status: scan.status,
        };
      })
    );

    return {
      scans: enriched,
      stats: {
        scanned: scans.length,
        totalConfirmed,
        remaining: totalConfirmed - scans.length,
      },
    };
  },
});
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
