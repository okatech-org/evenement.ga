import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    password: v.optional(v.string()),
    image: v.optional(v.string()),
    role: v.string(), // ORGANIZER | CO_ORGANIZER
    plan: v.string(), // FREE | ESSENTIEL | PREMIUM | ENTREPRISE
    emailVerified: v.optional(v.number()),
  }).index("by_email", ["email"]),

  events: defineTable({
    slug: v.string(),
    title: v.string(),
    type: v.string(), // MARIAGE | ANNIVERSAIRE | DEUIL | BAPTEME | CONFERENCE | PRIVE
    dates: v.array(v.number()), // array of timestamps — multi-day support
    location: v.optional(v.string()), // legacy simple location
    description: v.optional(v.string()),
    status: v.string(), // DRAFT | PUBLISHED | ARCHIVED
    visibility: v.string(), // PUBLIC | SEMI_PRIVATE | PRIVATE | PASSWORD
    password: v.optional(v.string()),
    maxGuests: v.optional(v.number()),
    userId: v.id("users"),
  })
    .index("by_slug", ["slug"])
    .index("by_user", ["userId"]),

  // Multi-venue support: each event can have multiple venues on specific dates
  eventVenues: defineTable({
    eventId: v.id("events"),
    name: v.string(), // venue name (e.g. "Salle de réception")
    address: v.string(), // full address
    date: v.number(), // timestamp for which day this venue applies
    startTime: v.string(), // "14:00"
    endTime: v.optional(v.string()), // "18:00"
    order: v.number(), // sort order within the day
    description: v.optional(v.string()),
  }).index("by_event", ["eventId"]),

  eventThemes: defineTable({
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
  }).index("by_event", ["eventId"]),

  eventModules: defineTable({
    eventId: v.id("events"),
    type: v.string(), // MOD_INVITE | MOD_RSVP | MOD_MENU | MOD_QR | ...
    active: v.boolean(),
    order: v.number(),
    configJson: v.optional(v.string()),
  })
    .index("by_event", ["eventId"])
    .index("by_event_type", ["eventId", "type"]),

  guests: defineTable({
    eventId: v.id("events"),
    firstName: v.string(),
    lastName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    group: v.optional(v.string()),
    status: v.string(), // INVITED | SEEN | CONFIRMED | DECLINED | ABSENT
    qrToken: v.optional(v.string()),
    qrExpiresAt: v.optional(v.number()),
  })
    .index("by_event", ["eventId"])
    .index("by_email", ["email"])
    .index("by_qr_token", ["qrToken"]),

  rsvps: defineTable({
    guestId: v.id("guests"),
    presence: v.boolean(),
    adultCount: v.number(),
    childrenCount: v.number(),
    menuChoice: v.optional(v.string()),
    allergies: v.array(v.string()),
    message: v.optional(v.string()),
  }).index("by_guest", ["guestId"]),

  qrScans: defineTable({
    guestId: v.id("guests"),
    eventId: v.id("events"),
    scannedBy: v.id("users"),
    status: v.string(), // VALID | ALREADY_SCANNED | INVALID | EXPIRED
  }).index("by_guest", ["guestId"]).index("by_event", ["eventId"]),

  chatMessages: defineTable({
    eventId: v.id("events"),
    userId: v.id("users"),
    channel: v.string(),
    content: v.string(),
    type: v.string(), // TEXT | IMAGE | REACTION
  }).index("by_event_channel", ["eventId", "channel"]),

  notifications: defineTable({
    userId: v.id("users"),
    type: v.string(),
    content: v.string(),
    read: v.boolean(),
  }).index("by_user", ["userId"]),
});
