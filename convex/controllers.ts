import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ─── List Controllers by Event (admin) ──────────────
// Retourne les controller links + comptage des scans (via qrScans).
export const listByEvent = query({
  args: {
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

    const links = await ctx.db
      .query("controllerLinks")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    // Comptage des scans par controller — qrScans n'a pas de controllerLinkId dans
    // le schéma actuel Convex ; on retourne 0 par défaut jusqu'à ce que la table
    // qrScans soit enrichie. Les scans globaux restent consultables via qr.ts.
    const enriched = links.map((link) => ({
      id: link._id,
      token: link.token,
      label: link.label,
      permission: link.permission,
      isActive: link.isActive,
      expiresAt: link.expiresAt ?? null,
      createdAt: link._creationTime,
      lastUsedAt: link.lastUsedAt ?? null,
      scanCount: 0, // Placeholder — à enrichir si on ajoute controllerLinkId à qrScans
    }));

    // Tri : plus récents d'abord
    enriched.sort((a, b) => b.createdAt - a.createdAt);
    return enriched;
  },
});

// ─── Create Controller Link ─────────────────────────
export const create = mutation({
  args: {
    eventId: v.id("events"),
    email: v.string(),
    token: v.string(), // Généré côté API (randomBytes)
    label: v.string(),
    permission: v.string(), // "VERIFY" | "SCAN"
    expiresAt: v.optional(v.number()), // timestamp ms
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

    if (!args.label || args.label.trim().length === 0) {
      throw new Error("Label requis");
    }

    const permission = args.permission === "SCAN" ? "SCAN" : "VERIFY";

    const linkId = await ctx.db.insert("controllerLinks", {
      eventId: args.eventId,
      token: args.token,
      label: args.label.trim(),
      permission,
      isActive: true,
      expiresAt: args.expiresAt,
    });

    const link = await ctx.db.get(linkId);
    if (!link) throw new Error("Insert failed");

    return {
      id: link._id,
      token: link.token,
      label: link.label,
      permission: link.permission,
      isActive: link.isActive,
      expiresAt: link.expiresAt ?? null,
      createdAt: link._creationTime,
      scanCount: 0,
    };
  },
});

// ─── Toggle Active State ────────────────────────────
export const toggle = mutation({
  args: {
    linkId: v.id("controllerLinks"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (!user) throw new Error("User not found");

    const link = await ctx.db.get(args.linkId);
    if (!link) throw new Error("Lien non trouvé");

    const event = await ctx.db.get(link.eventId);
    if (!event || event.userId !== user._id) {
      throw new Error("Access denied");
    }

    const newState = !link.isActive;
    await ctx.db.patch(args.linkId, { isActive: newState });
    return { isActive: newState };
  },
});

// ─── Remove Controller Link ─────────────────────────
export const remove = mutation({
  args: {
    linkId: v.id("controllerLinks"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (!user) throw new Error("User not found");

    const link = await ctx.db.get(args.linkId);
    if (!link) throw new Error("Lien non trouvé");

    const event = await ctx.db.get(link.eventId);
    if (!event || event.userId !== user._id) {
      throw new Error("Access denied");
    }

    await ctx.db.delete(args.linkId);
    return { success: true };
  },
});

// ─── Get Controller by Token (public pour page /verify/[token]) ──
// Validation de token au scan — retourne event info si actif et non expiré.
export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("controllerLinks")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!link) return null;
    if (!link.isActive) return null;
    if (link.expiresAt && link.expiresAt < Date.now()) return null;

    const event = await ctx.db.get(link.eventId);
    if (!event) return null;

    return {
      id: link._id,
      eventId: link.eventId,
      label: link.label,
      permission: link.permission,
      event: {
        id: event._id,
        title: event.title,
        slug: event.slug,
      },
    };
  },
});

// ─── Update lastUsedAt (au scan) ────────────────────
export const touchLastUsed = mutation({
  args: { linkId: v.id("controllerLinks") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.linkId, { lastUsedAt: Date.now() });
  },
});

// ─── Get Controller + Stats (public, via token) ─────
// Utilisé par la page publique /verify/[token] pour afficher l'event info et les stats live.
export const getByTokenWithStats = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("controllerLinks")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!link) return null;

    // Expirations et états contrôlés côté API pour un message d'erreur précis
    const now = Date.now();

    const event = await ctx.db.get(link.eventId);
    if (!event) return null;

    const [allGuests, allScans] = await Promise.all([
      ctx.db
        .query("guests")
        .withIndex("by_event", (q) => q.eq("eventId", link.eventId))
        .collect(),
      ctx.db
        .query("qrScans")
        .withIndex("by_event", (q) => q.eq("eventId", link.eventId))
        .collect(),
    ]);

    const totalConfirmed = allGuests.filter((g) => g.status === "CONFIRMED").length;
    const totalScanned = allScans.length;

    return {
      link: {
        id: link._id,
        token: link.token,
        label: link.label,
        permission: link.permission,
        isActive: link.isActive,
        expired: !!(link.expiresAt && link.expiresAt < now),
      },
      event: {
        id: event._id,
        title: event.title,
        slug: event.slug,
        type: event.type,
        date: event.dates[0] ?? 0,
        status: event.status,
      },
      stats: {
        totalGuests: allGuests.length,
        totalConfirmed,
        totalScanned,
        remaining: Math.max(0, totalConfirmed - totalScanned),
      },
    };
  },
});

// ─── Verify or Scan by Controller (public, via token) ──
// Args : token + query (inviteToken / URL / guest name) + action ("scan" | "verify")
// Retourne un objet { status, message, ... } compatible avec l'ancienne API Prisma.
export const verifyAndScan = mutation({
  args: {
    token: v.string(),
    query: v.string(),
    action: v.optional(v.string()), // "scan" | "verify" (default: "verify")
  },
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("controllerLinks")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!link) throw new Error("Lien invalide");
    if (!link.isActive) throw new Error("Ce lien a été désactivé");
    if (link.expiresAt && link.expiresAt < Date.now()) {
      throw new Error("Ce lien a expiré");
    }

    const eventId = link.eventId;
    const trimmedQuery = args.query.trim();
    if (!trimmedQuery) throw new Error("Requête invalide");

    // ── Stratégies de recherche guest ──
    const allGuests = await ctx.db
      .query("guests")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .collect();

    let guest: typeof allGuests[number] | null = null;

    // 1. Par inviteToken exact
    guest = allGuests.find((g) => g.inviteToken === trimmedQuery) ?? null;

    // 2. Parser URL (format .../slug?guest=TOKEN ou .../scan/slug/TOKEN)
    if (!guest) {
      let extracted: string | null = null;
      try {
        const url = new URL(trimmedQuery);
        extracted = url.searchParams.get("guest");
      } catch {
        const parts = trimmedQuery.split("/");
        extracted = parts[parts.length - 1] || null;
      }
      if (extracted) {
        guest =
          allGuests.find(
            (g) =>
              g.inviteToken === extracted ||
              (g.qrToken && g.qrToken.includes(extracted!))
          ) ?? null;
      }
    }

    // 3. Recherche par nom (mots multiples, insensitive)
    if (!guest) {
      const words = trimmedQuery
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);
      if (words.length > 0) {
        guest =
          allGuests.find((g) => {
            const first = (g.firstName || "").toLowerCase();
            const last = (g.lastName || "").toLowerCase();
            return words.every((w) => first.includes(w) || last.includes(w));
          }) ?? null;
      }
    }

    if (!guest) {
      return {
        status: "INVALID",
        message: "❌ Invité non trouvé",
        color: "red",
      };
    }

    // ── Statut guest ──
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

    if (guest.status !== "CONFIRMED") {
      return {
        status: "NOT_CONFIRMED",
        message: `${guest.firstName} ${guest.lastName} — Pas encore confirmé`,
        color: "orange",
        guest: {
          firstName: guest.firstName,
          lastName: guest.lastName,
          group: guest.group,
          status: guest.status,
        },
      };
    }

    // RSVP pour enrichir la réponse
    const rsvp = await ctx.db
      .query("rsvps")
      .withIndex("by_guest", (q) => q.eq("guestId", guest!._id))
      .first();

    // Déjà scanné ?
    const existingScan = await ctx.db
      .query("qrScans")
      .withIndex("by_guest", (q) => q.eq("guestId", guest!._id))
      .first();

    if (existingScan) {
      return {
        status: "ALREADY_SCANNED",
        message: `⚠️ ${guest.firstName} ${guest.lastName} — Déjà enregistré`,
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

    // ── SCAN : enregistrer l'entrée ──
    if (link.permission === "SCAN" && args.action === "scan") {
      await ctx.db.insert("qrScans", {
        guestId: guest._id,
        eventId,
        controllerLinkId: link._id,
        status: "VALID",
      });

      await ctx.db.patch(link._id, { lastUsedAt: Date.now() });

      return {
        status: "VALID",
        message: `✅ Bienvenue ${guest.firstName} ${guest.lastName} !`,
        color: "green",
        recorded: true,
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

    // ── VERIFY : lecture seule ──
    return {
      status: "VALID",
      message: `✅ ${guest.firstName} ${guest.lastName} — Invitation valide`,
      color: "green",
      recorded: false,
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
