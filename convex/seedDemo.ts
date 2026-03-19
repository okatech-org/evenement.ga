import { mutation, query } from "./_generated/server";

// ─── Constants ──────────────────────────────────────
const DEMO_PASSWORD_HASH = "$2b$12$s563fRFT8ohCXBZjf0QbAOFgFwnkW//FmT.OxGp1O6/3CsHw446QO"; // "demo1234"

const NOW = Date.now();
const DAY_MS = 24 * 60 * 60 * 1000;
const daysFromNow = (d: number) => NOW + d * DAY_MS;

// ─── Theme Presets ──────────────────────────────────
const THEME_PRESETS: Record<string, {
  preset: string; entryEffect: string; ambientEffect?: string;
  ambientIntensity: number; scrollReveal: string; cursorEffect?: string;
  colorPrimary: string; colorSecondary: string; colorAccent: string;
  colorBackground: string; colorText: string; colorSurface: string;
  colorMuted: string; colorBorder: string; fontDisplay: string; fontBody: string;
}> = {
  "mariage-ray-ashly": {
    preset: "mariage-ray-ashly", entryEffect: "floral_draw", ambientEffect: "floating_petals",
    ambientIntensity: 0.7, scrollReveal: "stagger_lines", cursorEffect: "petal",
    colorPrimary: "#8B5C6E", colorSecondary: "#C48B90", colorAccent: "#C9A96E",
    colorBackground: "#FFFDF9", colorText: "#3D2428", colorSurface: "#F5EBE0",
    colorMuted: "#DDB89A", colorBorder: "#EDD5C5",
    fontDisplay: "Cormorant Garamond", fontBody: "Montserrat",
  },
  mariage: {
    preset: "mariage", entryEffect: "floral_draw", ambientEffect: "floating_petals",
    ambientIntensity: 0.6, scrollReveal: "stagger_lines", cursorEffect: "petal",
    colorPrimary: "#8B5A6A", colorSecondary: "#C48B90", colorAccent: "#C9A96E",
    colorBackground: "#FFFDF9", colorText: "#3D2428", colorSurface: "#FFFFFF",
    colorMuted: "#9B8A8E", colorBorder: "#E8DDD5",
    fontDisplay: "Cormorant Garamond", fontBody: "Montserrat",
  },
  anniversaire: {
    preset: "anniversaire", entryEffect: "curtain_confetti", ambientEffect: "sparkle",
    ambientIntensity: 0.8, scrollReveal: "fade_up",
    colorPrimary: "#E8734A", colorSecondary: "#C9A96E", colorAccent: "#F2C94C",
    colorBackground: "#FFFEF8", colorText: "#2D1810", colorSurface: "#FFFFFF",
    colorMuted: "#A89080", colorBorder: "#F0E6D8",
    fontDisplay: "Playfair Display", fontBody: "Poppins",
  },
  deuil: {
    preset: "deuil", entryEffect: "morning_mist",
    ambientIntensity: 0.2, scrollReveal: "fade_up",
    colorPrimary: "#4A5568", colorSecondary: "#A0AEC0", colorAccent: "#B8943E",
    colorBackground: "#F9F8F6", colorText: "#1A202C", colorSurface: "#FFFFFF",
    colorMuted: "#A0AEC0", colorBorder: "#E2E8F0",
    fontDisplay: "Libre Baskerville", fontBody: "Source Sans Pro",
  },
  conference: {
    preset: "conference", entryEffect: "fade_fast", ambientEffect: "geometric_grid",
    ambientIntensity: 0.3, scrollReveal: "slide_left",
    colorPrimary: "#1E3A5F", colorSecondary: "#3B82F6", colorAccent: "#10B981",
    colorBackground: "#FFFFFF", colorText: "#111827", colorSurface: "#F9FAFB",
    colorMuted: "#6B7280", colorBorder: "#E5E7EB",
    fontDisplay: "Inter", fontBody: "Inter",
  },
  bapteme: {
    preset: "bapteme", entryEffect: "fade_white", ambientEffect: "bubbles",
    ambientIntensity: 0.5, scrollReveal: "fade_up",
    colorPrimary: "#93C5FD", colorSecondary: "#C4B5FD", colorAccent: "#D1D5DB",
    colorBackground: "#F8FAFF", colorText: "#1E3A5F", colorSurface: "#FFFFFF",
    colorMuted: "#94A3B8", colorBorder: "#E0E7FF",
    fontDisplay: "Nunito", fontBody: "Open Sans",
  },
};

// ─── Demo Users ─────────────────────────────────────
const DEMO_USERS = [
  { email: "demo-ray-ashly@eventflow.app", name: "Ray & Ashly — Mariage Octobre 2026", plan: "PREMIUM", role: "ORGANIZER", demoAccountType: "mariage-ray-ashly" },
  { email: "demo-mariage@eventflow.app", name: "Sophie & Marc Dupont", plan: "PREMIUM", role: "ORGANIZER", demoAccountType: "mariage" },
  { email: "demo-anniversaire@eventflow.app", name: "Famille Koné", plan: "ESSENTIEL", role: "ORGANIZER", demoAccountType: "anniversaire" },
  { email: "demo-deuil@eventflow.app", name: "Famille Mbeki", plan: "ESSENTIEL", role: "ORGANIZER", demoAccountType: "deuil" },
  { email: "demo-conference@eventflow.app", name: "TechSummit Paris", plan: "PREMIUM", role: "ORGANIZER", demoAccountType: "conference" },
  { email: "demo-bapteme@eventflow.app", name: "Jonathan & Amina Traoré", plan: "FREE", role: "ORGANIZER", demoAccountType: "bapteme" },
  { email: "demo-coorg@eventflow.app", name: "Alex Martin (Co-organisateur)", plan: "FREE", role: "CO_ORGANIZER", demoAccountType: "coorg" },
  { email: "demo-invite@eventflow.app", name: "Invité Démo", plan: "FREE", role: "GUEST_PREVIEW", demoAccountType: "invite" },
  { email: "superadmin@eventflow.app", name: "Admin EventFlow", plan: "ENTREPRISE", role: "SUPER_ADMIN", demoAccountType: "superadmin" },
];

interface GuestDef { firstName: string; lastName: string; email: string; group: string; status: string; }

// ─── Demo Events ────────────────────────────────────
const DEMO_EVENTS = [
  {
    slug: "mariage-ray-et-ashly-2026",
    title: "Mariage de Ray & Ashly",
    type: "MARIAGE",
    dates: [new Date("2026-10-23T14:00:00").getTime(), new Date("2026-10-24T11:00:00").getTime()],
    location: "37 Rue André Le Bourblanc, 78590 Noisy le Roi",
    description: "Rejoignez-nous pour célébrer l'union de Ray & Ashly dans une atmosphère de rose d'automne et d'élégance royale.",
    visibility: "SEMI_PRIVATE",
    ownerEmail: "demo-ray-ashly@eventflow.app",
    themePreset: "mariage-ray-ashly",
    moduleTypes: ["MOD_INVITE", "MOD_PROGRAMME", "MOD_RSVP", "MOD_MENU", "MOD_QR", "MOD_LOGISTIQUE", "MOD_CHAT", "MOD_GALERIE"],
    guests: [
      { firstName: "Famille", lastName: "Koné", email: "famille.kone@test-eventflow.app", group: "Famille mariée", status: "CONFIRMED" },
      { firstName: "Mireille", lastName: "Dubois", email: "mireille.dubois@test-eventflow.app", group: "Amis", status: "CONFIRMED" },
      { firstName: "Patrick", lastName: "Sandra M.", email: "patrick.sandra@test-eventflow.app", group: "Amis", status: "CONFIRMED" },
      { firstName: "Tonton", lastName: "Brice", email: "tonton.brice@test-eventflow.app", group: "Famille marié", status: "CONFIRMED" },
      { firstName: "Isabelle", lastName: "Laurent", email: "isabelle.laurent@test-eventflow.app", group: "Amis", status: "CONFIRMED" },
      { firstName: "Jean-Claude", lastName: "Moreau", email: "jc.moreau@test-eventflow.app", group: "Collègues", status: "CONFIRMED" },
      { firstName: "Pierre", lastName: "Deschamps", email: "pierre.deschamps@test-eventflow.app", group: "Collègues", status: "DECLINED" },
      { firstName: "Famille", lastName: "Tremblay", email: "famille.tremblay@test-eventflow.app", group: "Amis", status: "DECLINED" },
      { firstName: "Joëlle", lastName: "Kamara", email: "joelle.kamara@test-eventflow.app", group: "Amis", status: "INVITED" },
      { firstName: "Rudy", lastName: "Priscilla", email: "rudy.priscilla@test-eventflow.app", group: "Amis", status: "INVITED" },
    ] as GuestDef[],
  },
  {
    slug: "demo-mariage-sophie-marc",
    title: "Mariage de Sophie & Marc",
    type: "MARIAGE",
    dates: [daysFromNow(90)],
    location: "Château de Versailles-sur-Loire, 78100",
    description: "Rejoignez-nous pour célébrer notre union dans la magie de l'automne.",
    visibility: "SEMI_PRIVATE",
    ownerEmail: "demo-mariage@eventflow.app",
    themePreset: "mariage",
    moduleTypes: ["MOD_INVITE", "MOD_RSVP", "MOD_MENU", "MOD_QR", "MOD_PROGRAMME", "MOD_CHAT", "MOD_GALERIE", "MOD_DASHBOARD"],
    guests: [
      { firstName: "Jean-Claude", lastName: "Dupont", email: "jc.dupont@test-eventflow.app", group: "Famille marié", status: "CONFIRMED" },
      { firstName: "Marie-Claire", lastName: "Dupont", email: "mc.dupont@test-eventflow.app", group: "Famille marié", status: "CONFIRMED" },
      { firstName: "Amadou", lastName: "Diallo", email: "amadou.diallo@test-eventflow.app", group: "Amis", status: "CONFIRMED" },
      { firstName: "Paul", lastName: "Roux", email: "paul.roux@test-eventflow.app", group: "Collègues", status: "DECLINED" },
      { firstName: "Nathalie", lastName: "Girard", email: "nathalie.girard@test-eventflow.app", group: "Amis", status: "DECLINED" },
      { firstName: "François", lastName: "Duval", email: "francois.duval@test-eventflow.app", group: "Collègues", status: "INVITED" },
      { firstName: "Aminata", lastName: "Koné", email: "aminata.kone@test-eventflow.app", group: "Amis", status: "INVITED" },
    ] as GuestDef[],
  },
  {
    slug: "demo-anniversaire-50ans-kone",
    title: "Les 50 ans de Mamadou Koné",
    type: "ANNIVERSAIRE",
    dates: [daysFromNow(30)],
    location: "Salle des Fêtes de Créteil, 94000",
    description: "Venez fêter le demi-siècle d'un homme exceptionnel !",
    visibility: "SEMI_PRIVATE",
    ownerEmail: "demo-anniversaire@eventflow.app",
    themePreset: "anniversaire",
    moduleTypes: ["MOD_INVITE", "MOD_RSVP", "MOD_MENU", "MOD_PROGRAMME", "MOD_GALERIE", "MOD_DASHBOARD"],
    guests: [
      { firstName: "Mamadou", lastName: "Koné", email: "mamadou.kone@test-eventflow.app", group: "Famille", status: "CONFIRMED" },
      { firstName: "Fatoumata", lastName: "Koné", email: "fatoumata.kone@test-eventflow.app", group: "Famille", status: "CONFIRMED" },
      { firstName: "Seydou", lastName: "Diop", email: "seydou.diop@test-eventflow.app", group: "Amis", status: "CONFIRMED" },
      { firstName: "Rachid", lastName: "Benali", email: "rachid.benali@test-eventflow.app", group: "Amis", status: "DECLINED" },
      { firstName: "Ousmane", lastName: "Dembélé", email: "ousmane.dembele@test-eventflow.app", group: "Famille", status: "INVITED" },
    ] as GuestDef[],
  },
  {
    slug: "demo-deuil-famille-mbeki",
    title: "En mémoire de Jean-Pierre Mbeki",
    type: "DEUIL",
    dates: [daysFromNow(7)],
    location: "Église Saint-Joseph, Montreuil 93100",
    description: "La famille Mbeki vous convie à une cérémonie de recueillement en hommage à Jean-Pierre.",
    visibility: "SEMI_PRIVATE",
    ownerEmail: "demo-deuil@eventflow.app",
    themePreset: "deuil",
    moduleTypes: ["MOD_INVITE", "MOD_RSVP", "MOD_PROGRAMME", "MOD_DASHBOARD"],
    guests: [
      { firstName: "Paul", lastName: "Mbeki", email: "paul.mbeki@test-eventflow.app", group: "Famille", status: "CONFIRMED" },
      { firstName: "Rose", lastName: "Mbeki", email: "rose.mbeki@test-eventflow.app", group: "Famille", status: "CONFIRMED" },
      { firstName: "Michel", lastName: "Biyoghe", email: "michel.biyoghe@test-eventflow.app", group: "Communauté", status: "DECLINED" },
      { firstName: "Gabriel", lastName: "Nkoghe", email: "gabriel.nkoghe@test-eventflow.app", group: "Amis proches", status: "INVITED" },
    ] as GuestDef[],
  },
  {
    slug: "demo-conference-techsummit-2026",
    title: "TechSummit Paris 2026",
    type: "CONFERENCE",
    dates: [daysFromNow(60)],
    location: "Palais des Congrès, Paris 75017",
    description: "La conférence tech de référence en Europe. 20 speakers, 2 jours, 1 vision.",
    visibility: "PUBLIC",
    ownerEmail: "demo-conference@eventflow.app",
    themePreset: "conference",
    moduleTypes: ["MOD_INVITE", "MOD_RSVP", "MOD_QR", "MOD_PROGRAMME", "MOD_CHAT", "MOD_DASHBOARD"],
    guests: [
      { firstName: "Alexandre", lastName: "Lefèvre", email: "alexandre.lefevre@test-eventflow.app", group: "Speakers", status: "CONFIRMED" },
      { firstName: "Fatima", lastName: "Diallo", email: "fatima.diallo@test-eventflow.app", group: "VIP", status: "CONFIRMED" },
      { firstName: "Nicolas", lastName: "Moreau", email: "nicolas.moreau@test-eventflow.app", group: "Standard", status: "CONFIRMED" },
      { firstName: "Khadija", lastName: "Touré", email: "khadija.toure@test-eventflow.app", group: "Presse", status: "CONFIRMED" },
      { firstName: "Philippe", lastName: "Gautier", email: "philippe.gautier@test-eventflow.app", group: "Partenaires", status: "CONFIRMED" },
      { firstName: "Stéphane", lastName: "Lambert", email: "stephane.lambert@test-eventflow.app", group: "Standard", status: "DECLINED" },
      { firstName: "Guillaume", lastName: "Fontaine", email: "guillaume.fontaine@test-eventflow.app", group: "Standard", status: "INVITED" },
    ] as GuestDef[],
  },
  {
    slug: "demo-bapteme-eden-traore",
    title: "Baptême d'Eden Traoré",
    type: "BAPTEME",
    dates: [daysFromNow(45)],
    location: "Paroisse Saint-Michel, Bobigny 93000",
    description: "Partagez avec nous la joie de l'entrée dans la foi de notre petit Eden.",
    visibility: "SEMI_PRIVATE",
    ownerEmail: "demo-bapteme@eventflow.app",
    themePreset: "bapteme",
    moduleTypes: ["MOD_INVITE", "MOD_RSVP", "MOD_MENU", "MOD_GALERIE", "MOD_DASHBOARD"],
    guests: [
      { firstName: "Jonathan", lastName: "Traoré", email: "jonathan.traore@test-eventflow.app", group: "Parents", status: "CONFIRMED" },
      { firstName: "Amina", lastName: "Traoré", email: "amina.traore@test-eventflow.app", group: "Parents", status: "CONFIRMED" },
      { firstName: "Fanta", lastName: "Diakité", email: "fanta.diakite@test-eventflow.app", group: "Parrain/Marraine", status: "CONFIRMED" },
      { firstName: "Karim", lastName: "Sané", email: "karim.sane@test-eventflow.app", group: "Famille élargie", status: "DECLINED" },
      { firstName: "Pascale", lastName: "Masson", email: "pascale.masson@test-eventflow.app", group: "Amis", status: "INVITED" },
    ] as GuestDef[],
  },
];

// ─── Main Seed Mutation ─────────────────────────────
export const run = mutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding demo data to Convex...");

    // 1. Create demo users
    const userMap: Record<string, string> = {};

    for (const u of DEMO_USERS) {
      // Check if user already exists
      const existing = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", u.email))
        .first();

      if (existing) {
        // Update existing user
        await ctx.db.patch(existing._id, {
          name: u.name,
          role: u.role,
          plan: u.plan,
          isDemoAccount: true,
          demoAccountType: u.demoAccountType,
        });
        userMap[u.email] = existing._id;
      } else {
        const id = await ctx.db.insert("users", {
          email: u.email,
          name: u.name,
          password: DEMO_PASSWORD_HASH,
          role: u.role,
          plan: u.plan,
          isDemoAccount: true,
          demoAccountType: u.demoAccountType,
        });
        userMap[u.email] = id;
      }
    }

    // 2. Create GlobalConfig
    const existingConfig = await ctx.db
      .query("globalConfig")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .first();

    if (!existingConfig) {
      await ctx.db.insert("globalConfig", {
        key: "global",
        maintenanceMode: false,
        newRegistrations: true,
        demoEnabled: true,
      });
    }

    // 3. Create demo events
    for (const evtDef of DEMO_EVENTS) {
      const userId = userMap[evtDef.ownerEmail];
      if (!userId) continue;

      // Check if event already exists
      const existingEvent = await ctx.db
        .query("events")
        .withIndex("by_slug", (q) => q.eq("slug", evtDef.slug))
        .first();

      let eventId: string;

      if (existingEvent) {
        await ctx.db.patch(existingEvent._id, {
          title: evtDef.title,
          type: evtDef.type,
          dates: evtDef.dates,
          location: evtDef.location,
          description: evtDef.description,
          visibility: evtDef.visibility,
          status: "PUBLISHED",
        });
        eventId = existingEvent._id;
      } else {
        eventId = await ctx.db.insert("events", {
          slug: evtDef.slug,
          title: evtDef.title,
          type: evtDef.type,
          dates: evtDef.dates,
          location: evtDef.location,
          description: evtDef.description,
          status: "PUBLISHED",
          visibility: evtDef.visibility,
          userId: userId as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        });
      }

      // Upsert theme
      const themeData = THEME_PRESETS[evtDef.themePreset];
      if (themeData) {
        const existingTheme = await ctx.db
          .query("eventThemes")
          .withIndex("by_event", (q) => q.eq("eventId", eventId as any))
          .first();

        if (existingTheme) {
          await ctx.db.patch(existingTheme._id, { ...themeData, soundEnabled: false });
        } else {
          await ctx.db.insert("eventThemes", {
            eventId: eventId as any,
            ...themeData,
            soundEnabled: false,
          });
        }
      }

      // Upsert modules
      for (let i = 0; i < evtDef.moduleTypes.length; i++) {
        const moduleType = evtDef.moduleTypes[i];
        const existingMod = await ctx.db
          .query("eventModules")
          .withIndex("by_event_type", (q) =>
            q.eq("eventId", eventId as any).eq("type", moduleType)
          )
          .first();

        if (!existingMod) {
          await ctx.db.insert("eventModules", {
            eventId: eventId as any,
            type: moduleType,
            order: i + 1,
            active: true,
          });
        }
      }

      // Create guests (skip if already there)
      for (const gDef of evtDef.guests) {
        const existingGuest = await ctx.db
          .query("guests")
          .withIndex("by_email", (q) => q.eq("email", gDef.email))
          .first();

        if (existingGuest && existingGuest.eventId === eventId) continue;

        const guestId = await ctx.db.insert("guests", {
          eventId: eventId as any,
          firstName: gDef.firstName,
          lastName: gDef.lastName,
          email: gDef.email,
          group: gDef.group,
          status: gDef.status,
        });

        // Create RSVP for CONFIRMED/DECLINED
        if (gDef.status === "CONFIRMED" || gDef.status === "DECLINED") {
          await ctx.db.insert("rsvps", {
            guestId: guestId as any,
            presence: gDef.status === "CONFIRMED",
            adultCount: gDef.status === "CONFIRMED" ? Math.floor(Math.random() * 2) + 1 : 1,
            childrenCount: gDef.status === "CONFIRMED" ? Math.floor(Math.random() * 2) : 0,
            allergies: [],
            message: gDef.status === "CONFIRMED"
              ? "Nous avons hâte d'être là ! 🎉"
              : "Nous serons de tout cœur avec vous.",
          });
        }
      }
    }

    return { success: true, message: "🎉 Demo seeding complete!" };
  },
});

// ─── Check if seeded ────────────────────────────────
export const isSeeded = query({
  handler: async (ctx) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "demo-ray-ashly@eventflow.app"))
      .first();
    return !!user;
  },
});
