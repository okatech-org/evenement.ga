import { PrismaClient, EventType, ModuleType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { config } from "dotenv";
import path from "node:path";

// Load .env.local for DATABASE_URL
config({ path: path.join(__dirname, "..", ".env.local") });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

const THEME_PRESETS_SEED: Record<string, {
  preset: string;
  entryEffect: string;
  ambientEffect: string | null;
  ambientIntensity: number;
  scrollReveal: string;
  cursorEffect: string | null;
  colorPrimary: string;
  colorSecondary: string;
  colorAccent: string;
  colorBackground: string;
  colorText: string;
  colorSurface: string;
  colorMuted: string;
  colorBorder: string;
  fontDisplay: string;
  fontBody: string;
}> = {
  mariage: {
    preset: "mariage",
    entryEffect: "floral_draw",
    ambientEffect: "floating_petals",
    ambientIntensity: 0.6,
    scrollReveal: "stagger_lines",
    cursorEffect: "petal",
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
  },
  anniversaire: {
    preset: "anniversaire",
    entryEffect: "curtain_confetti",
    ambientEffect: "sparkle",
    ambientIntensity: 0.8,
    scrollReveal: "fade_up",
    cursorEffect: null,
    colorPrimary: "#E8734A",
    colorSecondary: "#C9A96E",
    colorAccent: "#F2C94C",
    colorBackground: "#FFFEF8",
    colorText: "#2D1810",
    colorSurface: "#FFFFFF",
    colorMuted: "#A89080",
    colorBorder: "#F0E6D8",
    fontDisplay: "Playfair Display",
    fontBody: "Poppins",
  },
  deuil: {
    preset: "deuil",
    entryEffect: "morning_mist",
    ambientEffect: null,
    ambientIntensity: 0.2,
    scrollReveal: "fade_up",
    cursorEffect: null,
    colorPrimary: "#4A5568",
    colorSecondary: "#A0AEC0",
    colorAccent: "#B8943E",
    colorBackground: "#F9F8F6",
    colorText: "#1A202C",
    colorSurface: "#FFFFFF",
    colorMuted: "#A0AEC0",
    colorBorder: "#E2E8F0",
    fontDisplay: "Libre Baskerville",
    fontBody: "Source Sans Pro",
  },
  bapteme: {
    preset: "bapteme",
    entryEffect: "fade_white",
    ambientEffect: "bubbles",
    ambientIntensity: 0.5,
    scrollReveal: "fade_up",
    cursorEffect: null,
    colorPrimary: "#93C5FD",
    colorSecondary: "#C4B5FD",
    colorAccent: "#D1D5DB",
    colorBackground: "#F8FAFF",
    colorText: "#1E3A5F",
    colorSurface: "#FFFFFF",
    colorMuted: "#94A3B8",
    colorBorder: "#E0E7FF",
    fontDisplay: "Nunito",
    fontBody: "Open Sans",
  },
  conference: {
    preset: "conference",
    entryEffect: "fade_fast",
    ambientEffect: "geometric_grid",
    ambientIntensity: 0.3,
    scrollReveal: "slide_left",
    cursorEffect: null,
    colorPrimary: "#1E3A5F",
    colorSecondary: "#3B82F6",
    colorAccent: "#10B981",
    colorBackground: "#FFFFFF",
    colorText: "#111827",
    colorSurface: "#F9FAFB",
    colorMuted: "#6B7280",
    colorBorder: "#E5E7EB",
    fontDisplay: "Inter",
    fontBody: "Inter",
  },
  prive: {
    preset: "prive",
    entryEffect: "candle_reveal",
    ambientEffect: "starlight",
    ambientIntensity: 0.4,
    scrollReveal: "fade_up",
    cursorEffect: null,
    colorPrimary: "#C9A96E",
    colorSecondary: "#8B7355",
    colorAccent: "#D4AF37",
    colorBackground: "#0F0F0F",
    colorText: "#F5F0E8",
    colorSurface: "#1A1A1A",
    colorMuted: "#888888",
    colorBorder: "#333333",
    fontDisplay: "Raleway",
    fontBody: "Lato",
  },
};

const DEFAULT_MODULES: Record<EventType, { type: ModuleType; order: number; active: boolean }[]> = {
  MARIAGE: [
    { type: "MOD_INVITE", order: 1, active: true },
    { type: "MOD_RSVP", order: 2, active: true },
    { type: "MOD_MENU", order: 3, active: true },
    { type: "MOD_QR", order: 4, active: true },
    { type: "MOD_PROGRAMME", order: 5, active: true },
    { type: "MOD_CHAT", order: 6, active: false },
    { type: "MOD_GALERIE", order: 7, active: false },
    { type: "MOD_DASHBOARD", order: 8, active: true },
  ],
  ANNIVERSAIRE: [
    { type: "MOD_INVITE", order: 1, active: true },
    { type: "MOD_RSVP", order: 2, active: true },
    { type: "MOD_MENU", order: 3, active: true },
    { type: "MOD_GALERIE", order: 4, active: true },
    { type: "MOD_DASHBOARD", order: 5, active: true },
  ],
  DEUIL: [
    { type: "MOD_INVITE", order: 1, active: true },
    { type: "MOD_RSVP", order: 2, active: true },
    { type: "MOD_PROGRAMME", order: 3, active: true },
    { type: "MOD_DASHBOARD", order: 4, active: true },
  ],
  BAPTEME: [
    { type: "MOD_INVITE", order: 1, active: true },
    { type: "MOD_RSVP", order: 2, active: true },
    { type: "MOD_MENU", order: 3, active: true },
    { type: "MOD_GALERIE", order: 4, active: true },
    { type: "MOD_DASHBOARD", order: 5, active: true },
  ],
  CONFERENCE: [
    { type: "MOD_INVITE", order: 1, active: true },
    { type: "MOD_RSVP", order: 2, active: true },
    { type: "MOD_QR", order: 3, active: true },
    { type: "MOD_PROGRAMME", order: 4, active: true },
    { type: "MOD_CHAT", order: 5, active: true },
    { type: "MOD_DASHBOARD", order: 6, active: true },
  ],
  PRIVE: [
    { type: "MOD_INVITE", order: 1, active: true },
    { type: "MOD_RSVP", order: 2, active: true },
    { type: "MOD_QR", order: 3, active: true },
    { type: "MOD_DASHBOARD", order: 4, active: true },
  ],
};

async function main() {
  console.log("🌱 Seeding database...");

  // 1. Create test organizer
  const user = await prisma.user.upsert({
    where: { email: "organisateur@eventflow.test" },
    update: {},
    create: {
      email: "organisateur@eventflow.test",
      name: "Marie Dupont",
      password: "$2b$12$WS44EafaVLMMcXk1fddXcOEFkdWphE7BoxntvtU5qTlHMjb5LXHgO", // "password123"
      role: "ORGANIZER",
      plan: "PREMIUM",
    },
  });
  console.log(`  ✅ User: ${user.name} (${user.email})`);

  // 2. Create wedding event
  const event = await prisma.event.upsert({
    where: { slug: "mariage-roxane-et-andre" },
    update: {},
    create: {
      slug: "mariage-roxane-et-andre",
      title: "Mariage de Roxane & André",
      type: "MARIAGE",
      date: new Date("2026-07-15T14:00:00Z"),
      location: "Château de Versailles, Versailles",
      description:
        "Nous avons le plaisir de vous convier à notre union. Ce jour sera pour nous le plus beau, et nous espérons le partager avec vous.",
      status: "PUBLISHED",
      visibility: "SEMI_PRIVATE",
      maxGuests: 200,
      userId: user.id,
    },
  });
  console.log(`  ✅ Event: ${event.title} (/${event.slug})`);

  // 3. Create theme
  const themeData = THEME_PRESETS_SEED.mariage;
  await prisma.eventTheme.upsert({
    where: { eventId: event.id },
    update: {},
    create: {
      eventId: event.id,
      ...themeData,
    },
  });
  console.log(`  ✅ Theme: ${themeData.preset}`);

  // 4. Create modules
  const modules = DEFAULT_MODULES.MARIAGE;
  for (const mod of modules) {
    await prisma.eventModule.upsert({
      where: { eventId_type: { eventId: event.id, type: mod.type } },
      update: {},
      create: {
        eventId: event.id,
        type: mod.type,
        order: mod.order,
        active: mod.active,
        configJson: {},
      },
    });
  }
  console.log(`  ✅ Modules: ${modules.length} created`);

  // 5. Create guests with varied statuses
  const guests = [
    { firstName: "Jean", lastName: "Martin", email: "jean.martin@email.fr", group: "Famille", status: "CONFIRMED" as const },
    { firstName: "Sophie", lastName: "Bernard", email: "sophie.bernard@email.fr", group: "Famille", status: "CONFIRMED" as const },
    { firstName: "Pierre", lastName: "Dubois", email: "pierre.dubois@email.fr", group: "Amis", status: "CONFIRMED" as const },
    { firstName: "Isabelle", lastName: "Thomas", email: "isabelle.thomas@email.fr", group: "Amis", status: "DECLINED" as const },
    { firstName: "François", lastName: "Robert", email: "francois.robert@email.fr", group: "Collègues", status: "CONFIRMED" as const },
    { firstName: "Claire", lastName: "Richard", email: "claire.richard@email.fr", group: "Famille", status: "INVITED" as const },
    { firstName: "Antoine", lastName: "Petit", email: "antoine.petit@email.fr", group: "Amis", status: "SEEN" as const },
    { firstName: "Marie", lastName: "Moreau", email: "marie.moreau@email.fr", group: "Amis", status: "CONFIRMED" as const },
    { firstName: "Luc", lastName: "Simon", email: "luc.simon@email.fr", group: "VIP", status: "CONFIRMED" as const },
    { firstName: "Nadia", lastName: "Laurent", email: "nadia.laurent@email.fr", group: "Collègues", status: "INVITED" as const },
  ];

  for (const guestData of guests) {
    const guest = await prisma.guest.upsert({
      where: {
        id: `seed-guest-${guestData.email}`,
      },
      update: {},
      create: {
        id: `seed-guest-${guestData.email}`,
        eventId: event.id,
        firstName: guestData.firstName,
        lastName: guestData.lastName,
        email: guestData.email,
        group: guestData.group,
        status: guestData.status,
      },
    });

    // Create RSVP for confirmed/declined guests
    if (guestData.status === "CONFIRMED" || guestData.status === "DECLINED") {
      await prisma.rSVP.upsert({
        where: { guestId: guest.id },
        update: {},
        create: {
          guestId: guest.id,
          presence: guestData.status === "CONFIRMED",
          adultCount: guestData.status === "CONFIRMED" ? Math.floor(Math.random() * 2) + 1 : 1,
          childrenCount: guestData.status === "CONFIRMED" ? Math.floor(Math.random() * 2) : 0,
          menuChoice: guestData.status === "CONFIRMED"
            ? ["classique", "halal", "végétarien", "enfant"][Math.floor(Math.random() * 4)]
            : null,
          allergies: guestData.status === "CONFIRMED" && Math.random() > 0.7
            ? ["gluten"]
            : [],
          message: guestData.status === "CONFIRMED"
            ? "Nous avons hâte de fêter ce beau jour avec vous !"
            : "Nous serons de tout cœur avec vous.",
        },
      });
    }
  }
  console.log(`  ✅ Guests: ${guests.length} created with RSVPs`);

  console.log("\n🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
