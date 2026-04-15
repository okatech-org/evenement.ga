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

// ─── Patch Theme (partial, avec ownership via email) ─
// Remplace prisma.eventTheme.upsert avec validation partielle.
export const patchByEvent = mutation({
  args: {
    eventId: v.id("events"),
    email: v.string(),
    preset: v.optional(v.string()),
    entryEffect: v.optional(v.string()),
    ambientEffect: v.optional(v.union(v.string(), v.null())),
    ambientIntensity: v.optional(v.number()),
    scrollReveal: v.optional(v.string()),
    cursorEffect: v.optional(v.union(v.string(), v.null())),
    soundEnabled: v.optional(v.boolean()),
    soundUrl: v.optional(v.union(v.string(), v.null())),
    colorPrimary: v.optional(v.string()),
    colorSecondary: v.optional(v.string()),
    colorAccent: v.optional(v.string()),
    colorBackground: v.optional(v.string()),
    colorText: v.optional(v.string()),
    colorSurface: v.optional(v.string()),
    colorMuted: v.optional(v.string()),
    colorBorder: v.optional(v.string()),
    fontDisplay: v.optional(v.string()),
    fontBody: v.optional(v.string()),
    fontSizeTitle: v.optional(v.string()),
    fontSizeBody: v.optional(v.string()),
    letterSpacing: v.optional(v.string()),
    lineHeight: v.optional(v.string()),
    pageMedia: v.optional(v.string()), // JSON string
    pageThemes: v.optional(v.string()), // JSON string
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

    // Nettoyer args (enlever eventId et email du patch)
    const { eventId, email, ...rawPatch } = args;
    void eventId;
    void email;

    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rawPatch)) {
      if (value !== undefined) {
        patch[key] = value === null ? undefined : value;
      }
    }

    const existing = await ctx.db
      .query("eventThemes")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    } else {
      // Créer avec defaults pour champs required + patch par-dessus
      const defaults = {
        eventId: args.eventId,
        preset: "mariage",
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
      };
      return ctx.db.insert("eventThemes", { ...defaults, ...patch });
    }
  },
});
