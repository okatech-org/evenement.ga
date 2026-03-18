import { PrismaClient, EventType, ModuleType, GuestStatus, Plan, Role } from "@prisma/client";
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

// ─── Constants ──────────────────────────────────────────────

const DEMO_PASSWORD_HASH = "$2b$12$s563fRFT8ohCXBZjf0QbAOFgFwnkW//FmT.OxGp1O6/3CsHw446QO"; // "demo1234"

const NOW = new Date();
const DAY_MS = 24 * 60 * 60 * 1000;
const daysFromNow = (d: number) => new Date(NOW.getTime() + d * DAY_MS);
const daysAgo = (d: number) => new Date(NOW.getTime() - d * DAY_MS);

// ─── Theme Presets ──────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const THEME_PRESETS: Record<string, any> = {
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
    ambientIntensity: 0.8, scrollReveal: "fade_up", cursorEffect: null,
    colorPrimary: "#E8734A", colorSecondary: "#C9A96E", colorAccent: "#F2C94C",
    colorBackground: "#FFFEF8", colorText: "#2D1810", colorSurface: "#FFFFFF",
    colorMuted: "#A89080", colorBorder: "#F0E6D8",
    fontDisplay: "Playfair Display", fontBody: "Poppins",
  },
  deuil: {
    preset: "deuil", entryEffect: "morning_mist", ambientEffect: null,
    ambientIntensity: 0.2, scrollReveal: "fade_up", cursorEffect: null,
    colorPrimary: "#4A5568", colorSecondary: "#A0AEC0", colorAccent: "#B8943E",
    colorBackground: "#F9F8F6", colorText: "#1A202C", colorSurface: "#FFFFFF",
    colorMuted: "#A0AEC0", colorBorder: "#E2E8F0",
    fontDisplay: "Libre Baskerville", fontBody: "Source Sans Pro",
  },
  conference: {
    preset: "conference", entryEffect: "fade_fast", ambientEffect: "geometric_grid",
    ambientIntensity: 0.3, scrollReveal: "slide_left", cursorEffect: null,
    colorPrimary: "#1E3A5F", colorSecondary: "#3B82F6", colorAccent: "#10B981",
    colorBackground: "#FFFFFF", colorText: "#111827", colorSurface: "#F9FAFB",
    colorMuted: "#6B7280", colorBorder: "#E5E7EB",
    fontDisplay: "Inter", fontBody: "Inter",
  },
  bapteme: {
    preset: "bapteme", entryEffect: "fade_white", ambientEffect: "bubbles",
    ambientIntensity: 0.5, scrollReveal: "fade_up", cursorEffect: null,
    colorPrimary: "#93C5FD", colorSecondary: "#C4B5FD", colorAccent: "#D1D5DB",
    colorBackground: "#F8FAFF", colorText: "#1E3A5F", colorSurface: "#FFFFFF",
    colorMuted: "#94A3B8", colorBorder: "#E0E7FF",
    fontDisplay: "Nunito", fontBody: "Open Sans",
  },
};

// ─── Demo Users ─────────────────────────────────────────────

interface DemoUser {
  email: string;
  name: string;
  plan: Plan;
  role: Role;
  demoAccountType: string;
}

const DEMO_USERS: DemoUser[] = [
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

// ─── Demo Events ────────────────────────────────────────────

interface DemoEvent {
  slug: string;
  title: string;
  type: EventType;
  date: Date;
  location: string;
  description: string;
  visibility: "PUBLIC" | "SEMI_PRIVATE";
  ownerEmail: string;
  themePreset: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  modules: { type: ModuleType; order: number; active: boolean; configJson?: any }[];
  guests: { firstName: string; lastName: string; email: string; group: string; status: GuestStatus }[];
  menus?: string[];
  programme?: { time: string; title: string; description: string }[];
  chatMessages?: { content: string; senderIndex: number }[];
  galleryPhotos?: string[];
}

const DEMO_EVENTS: DemoEvent[] = [
  // ─── Mariage Ray & Ashly (VITRINE) ─────────────────────
  {
    slug: "mariage-ray-et-ashly-2026",
    title: "Mariage de Ray & Ashly",
    type: "MARIAGE",
    date: new Date("2026-10-23T14:00:00"),
    location: "37 Rue André Le Bourblanc, 78590 Noisy le Roi",
    description: "Rejoignez-nous pour célébrer l'union de Ray & Ashly dans une atmosphère de rose d'automne et d'élégance royale. Deux jours de fête, d'amour et de souvenirs inoubliables.",
    visibility: "SEMI_PRIVATE",
    ownerEmail: "demo-ray-ashly@eventflow.app",
    themePreset: "mariage-ray-ashly",
    modules: [
      { type: "MOD_INVITE", order: 1, active: true, configJson: {
        heroTagline: "Save the Date · 23 & 24 Octobre 2026",
        heroSubtitle: "Rose d'Automne & l'Élégance Royale",
        heroLocation: "Noisy le Roi · 78590",
        heroNote: "Deux jours de célébration · Vendredi & Samedi",
        heroImage: "https://images.unsplash.com/photo-1529634806980-85c3dd6d34ac?w=800",
        countdownTarget: "2026-10-23T14:00:00",
        demoDisclaimer: "Données de démonstration · Événement fictif basé sur un cas réel",
      } },
      { type: "MOD_PROGRAMME", order: 2, active: true, configJson: {
        days: [
          {
            label: "Jour 1 · 23 Oct",
            date: "2026-10-23",
            steps: [
              { time: "14:00", title: "Cérémonie Civile", description: "Mairie · Échange des consentements en présence des proches" },
              { time: "16:30", title: "Cérémonie Religieuse", description: "Bénédiction de l'union · Entrée des mariés" },
              { time: "18:00", title: "Vin d'Honneur & Cocktail", description: "Jardins du domaine · Champagne, petits fours, musique d'ambiance" },
              { time: "20:00", title: "Dîner de Gala", description: "Salle de réception · Repas gastronomique, discours, animation" },
              { time: "23:00", title: "Soirée Dansante", description: "Ouverture du bal des mariés · DJ set toute la nuit" },
            ],
          },
          {
            label: "Jour 2 · 24 Oct",
            date: "2026-10-24",
            steps: [
              { time: "11:00", title: "Brunch des Mariés", description: "Retrouvailles matinales · Brunch festif avec famille et proches" },
              { time: "14:00", title: "After Party & Ambiance", description: "Musique live · Danses · Derniers moments ensemble" },
              { time: "18:00", title: "Au Revoir & Départ des Mariés", description: "Jet de pétales · Voiture décorée · Envol vers le voyage de noces" },
            ],
          },
        ],
      } },
      { type: "MOD_RSVP", order: 3, active: true, configJson: {
        title: "Confirmez votre présence",
        intro: "Votre présence à nos côtés est notre plus beau cadeau. Merci de nous répondre avant le 15 Septembre 2026.",
        deadline: "2026-09-15",
        yesLabel: "Avec immense joie !",
        noLabel: "Je ne pourrai pas venir",
        confirmMessagePresent: "Merci {name} ! Votre présence nous comble de joie. Vous recevrez votre QR code d'entrée par email. À très bientôt le 23 Octobre !",
        confirmMessageAbsent: "Merci {name} pour votre réponse. Votre affection nous touche. Vous serez dans nos pensées en ce jour si précieux.",
        allergies: ["Gluten / Cœliaque", "Lactose / Produits laitiers", "Fruits à coque", "Fruits de mer / Crustacés", "Œufs", "Arachides", "Soja", "Autre"],
      } },
      { type: "MOD_MENU", order: 4, active: true, configJson: {
        note: "Ray & Ashly tiennent à ce que chaque convive se régale ! Merci de nous indiquer votre choix de menu et vos éventuelles allergies ou régimes alimentaires.",
        menus: [
          { name: "Menu Royal", icon: "🍽️", items: { entree: "Foie gras et sa brioche dorée, chutney de figues", plat: "Filet de bœuf en croûte, sauce périgueux, légumes de saison", dessert: "Pièce montée · Wedding cake rose & or" } },
          { name: "Menu Sans Porc / Halal", icon: "🌿", badge: "Sans Porc · Halal", description: "Viandes halal certifiées, aucun dérivé du porc", items: { entree: "Brick au poulet et légumes, sauce coriandre", plat: "Agneau rôti aux épices douces, semoule aux raisins", dessert: "Pièce montée · Wedding cake rose & or" } },
          { name: "Menu Végétarien", icon: "🥗", badge: "Végétarien", items: { entree: "Velouté de butternut, crème fraîche et noisettes", plat: "Risotto aux champignons des bois, parmesan, truffe", dessert: "Pièce montée · Wedding cake rose & or" } },
          { name: "Menu Enfant", icon: "🧒", badge: "Enfant · -12 ans", items: { plat: "Nuggets de poulet croustillants ou pâtes bolognaise", dessert: "Coupe de glace vanille-fraise avec topping" } },
        ],
      } },
      { type: "MOD_QR", order: 5, active: true },
      { type: "MOD_LOGISTIQUE", order: 6, active: true, configJson: {
        locations: [
          { type: "Cérémonie Civile & Religieuse", name: "Salle des fêtes · Noisy le Roi", address: "37 Rue André Le Bourblanc, 78590 Noisy le Roi", lat: 48.8392, lng: 1.9872, icon: "⛪", note: "Jour 1 · 14h00 → Cérémonie puis Dîner de gala" },
          { type: "Brunch & After Party", name: "Même salle · Lendemain", address: "37 Rue André Le Bourblanc, 78590 Noisy le Roi", lat: 48.8392, lng: 1.9872, icon: "🥂", note: "Jour 2 · À partir de 11h00" },
        ],
        hotel: "Des tarifs négociés sont disponibles dans les hôtels proches. Mentionnez 'Mariage Ray & Ashly' lors de votre réservation.",
        questions: ["J'ai besoin d'informations sur le stationnement", "Je souhaite être mis en relation pour du covoiturage", "Je viens de loin et cherche un hébergement", "J'ai besoin d'un accès PMR", "Je viens avec une poussette / siège bébé"],
      } },
      { type: "MOD_CHAT", order: 7, active: true },
      { type: "MOD_GALERIE", order: 8, active: true, configJson: { photos: [
        { url: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800", caption: "Palette florale du mariage" },
        { url: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800", caption: "L'ambiance qui nous attend le 23 Octobre" },
        { url: "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=800", caption: "Notre amour, gravé pour toujours" },
        { url: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800", caption: "La salle vous attend..." },
        { url: "https://images.unsplash.com/photo-1529634806980-85c3dd6d34ac?w=800", caption: null },
        { url: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=800", caption: "Rose d'Automne & l'Élégance Royale 🌹" },
      ] } },
    ],
    guests: [
      // CONFIRMED (16)
      { firstName: "Famille", lastName: "Koné", email: "famille.kone@test-eventflow.app", group: "Famille mariée", status: "CONFIRMED" },
      { firstName: "Mireille", lastName: "Dubois", email: "mireille.dubois@test-eventflow.app", group: "Amis", status: "CONFIRMED" },
      { firstName: "Patrick", lastName: "Sandra M.", email: "patrick.sandra@test-eventflow.app", group: "Amis", status: "CONFIRMED" },
      { firstName: "Tonton", lastName: "Brice", email: "tonton.brice@test-eventflow.app", group: "Famille marié", status: "CONFIRMED" },
      { firstName: "Famille", lastName: "Mensah", email: "famille.mensah@test-eventflow.app", group: "Famille mariée", status: "CONFIRMED" },
      { firstName: "Isabelle", lastName: "Laurent", email: "isabelle.laurent@test-eventflow.app", group: "Amis", status: "CONFIRMED" },
      { firstName: "Jean-Claude", lastName: "Moreau", email: "jc.moreau@test-eventflow.app", group: "Collègues", status: "CONFIRMED" },
      { firstName: "Marraine", lastName: "Christiane", email: "marraine.christiane@test-eventflow.app", group: "Famille mariée", status: "CONFIRMED" },
      { firstName: "Parrain", lastName: "Emmanuel", email: "parrain.emmanuel@test-eventflow.app", group: "Famille marié", status: "CONFIRMED" },
      { firstName: "Cousine", lastName: "Fatou", email: "cousine.fatou@test-eventflow.app", group: "Famille marié", status: "CONFIRMED" },
      { firstName: "David", lastName: "Chen", email: "david.chen@test-eventflow.app", group: "Amis", status: "CONFIRMED" },
      { firstName: "Tante", lastName: "Marie-Louise", email: "tante.ml@test-eventflow.app", group: "Famille mariée", status: "CONFIRMED" },
      { firstName: "Samuel", lastName: "Adama", email: "samuel.adama@test-eventflow.app", group: "Amis", status: "CONFIRMED" },
      { firstName: "Béatrice", lastName: "Thomas", email: "beatrice.thomas@test-eventflow.app", group: "Amis", status: "CONFIRMED" },
      { firstName: "Oncle", lastName: "Roger", email: "oncle.roger@test-eventflow.app", group: "Famille marié", status: "CONFIRMED" },
      { firstName: "Amina", lastName: "Diallo", email: "amina.diallo.ra@test-eventflow.app", group: "Amis", status: "CONFIRMED" },
      // DECLINED (5)
      { firstName: "Pierre", lastName: "Deschamps", email: "pierre.deschamps@test-eventflow.app", group: "Collègues", status: "DECLINED" },
      { firstName: "Famille", lastName: "Tremblay", email: "famille.tremblay@test-eventflow.app", group: "Amis", status: "DECLINED" },
      { firstName: "Cousin", lastName: "Marc", email: "cousin.marc@test-eventflow.app", group: "Famille marié", status: "DECLINED" },
      { firstName: "Clarisse", lastName: "Fontaine", email: "clarisse.fontaine@test-eventflow.app", group: "Amis", status: "DECLINED" },
      { firstName: "Théodore", lastName: "Nguyen", email: "theodore.nguyen@test-eventflow.app", group: "Collègues", status: "DECLINED" },
      // INVITED (6)
      { firstName: "Joëlle", lastName: "Kamara", email: "joelle.kamara@test-eventflow.app", group: "Amis", status: "INVITED" },
      { firstName: "Rudy", lastName: "Priscilla", email: "rudy.priscilla@test-eventflow.app", group: "Amis", status: "INVITED" },
      { firstName: "Madame", lastName: "Leclerc", email: "madame.leclerc@test-eventflow.app", group: "Famille mariée", status: "INVITED" },
      { firstName: "Famille", lastName: "Osei", email: "famille.osei@test-eventflow.app", group: "Amis", status: "INVITED" },
      { firstName: "Antoine", lastName: "Bernard", email: "antoine.bernard.ra@test-eventflow.app", group: "Collègues", status: "INVITED" },
      { firstName: "Naomi", lastName: "Washington", email: "naomi.washington@test-eventflow.app", group: "Amis", status: "INVITED" },
      // ABSENT (3)
      { firstName: "Georges", lastName: "Petit", email: "georges.petit@test-eventflow.app", group: "Collègues", status: "ABSENT" },
      { firstName: "Lucie", lastName: "Hamidou", email: "lucie.hamidou@test-eventflow.app", group: "Amis", status: "ABSENT" },
      { firstName: "Bertrand", lastName: "Mercier", email: "bertrand.mercier@test-eventflow.app", group: "Famille marié", status: "ABSENT" },
    ],
    chatMessages: [
      { content: "Reçu l'invitation, c'est tellement beau ! Ray et Ashly vous avez vraiment assuré sur le thème 🌹 Hâte d'être là !", senderIndex: 0 },
      { content: "On est de la partie ! Quelqu'un sait si on peut se garer facilement là-bas ?", senderIndex: 0 },
      { content: "Ma chérie Ashly, tu vas être la plus belle 😍 On vous aime fort.", senderIndex: 0 },
      { content: "Est-ce qu'il y aura de la musique afro le soir ? 🎵 Je demande pour un ami… (c'est pour moi 😂)", senderIndex: 0 },
      { content: "J'ai bien noté mon allergie au lactose dans le formulaire. Merci pour le menu végétarien c'est top !", senderIndex: 0 },
      { content: "Les enfants demandent déjà quand c'est le mariage 😄 Ils sont trop excités ! On sera là tous les 4.", senderIndex: 0 },
      { content: "Ray mon frère, ça va être MÉMORABLE. Prépare-toi 🔥", senderIndex: 0 },
      { content: "Ashly ma belle j'ai trop hâte !! Le thème est parfait pour vous deux 🌸", senderIndex: 0 },
      { content: "Question pratique : le samedi midi le brunch c'est à quelle heure exactement ? On viendra en famille", senderIndex: 0 },
      { content: "Merci à tous pour vos messages qui nous touchent infiniment ❤️ On répond à tout dès qu'on peut. Samedi c'est le jour J dans quelques mois... ON EST PRÊTS ! 🥂", senderIndex: 0 },
    ],
  },

  // ─── Mariage ────────────────────────────────────────────
  {
    slug: "demo-mariage-sophie-marc",
    title: "Mariage de Sophie & Marc",
    type: "MARIAGE",
    date: daysFromNow(90),
    location: "Château de Versailles-sur-Loire, 78100",
    description: "Rejoignez-nous pour célébrer notre union dans la magie de l'automne.",
    visibility: "SEMI_PRIVATE",
    ownerEmail: "demo-mariage@eventflow.app",
    themePreset: "mariage",
    modules: [
      { type: "MOD_INVITE", order: 1, active: true },
      { type: "MOD_RSVP", order: 2, active: true },
      { type: "MOD_MENU", order: 3, active: true, configJson: { menus: ["Classique", "Halal", "Végétarien", "Enfant"] } },
      { type: "MOD_QR", order: 4, active: true },
      { type: "MOD_PROGRAMME", order: 5, active: true, configJson: { steps: [
        { time: "14:00", title: "Cérémonie", description: "Cérémonie religieuse à la chapelle du château" },
        { time: "16:30", title: "Vin d'honneur", description: "Cocktail dans les jardins à la française" },
        { time: "17:00", title: "Cocktail", description: "Amuse-bouches et champagne au bord du lac" },
        { time: "19:00", title: "Dîner", description: "Dîner gastronomique dans la grande salle" },
        { time: "22:00", title: "Soirée dansante", description: "DJ et open bar jusqu'à l'aube" },
      ] } },
      { type: "MOD_CHAT", order: 6, active: true },
      { type: "MOD_GALERIE", order: 7, active: true, configJson: { photos: [
        "https://images.unsplash.com/photo-1519741497674-611481863552?w=800",
        "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800",
        "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800",
        "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=800",
        "https://images.unsplash.com/photo-1523438885200-e635ba2c371e?w=800",
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800",
      ] } },
      { type: "MOD_DASHBOARD", order: 8, active: true },
    ],
    guests: [
      { firstName: "Jean-Claude", lastName: "Dupont", email: "jc.dupont@test-eventflow.app", group: "Famille marié", status: "CONFIRMED" },
      { firstName: "Marie-Claire", lastName: "Dupont", email: "mc.dupont@test-eventflow.app", group: "Famille marié", status: "CONFIRMED" },
      { firstName: "Amadou", lastName: "Diallo", email: "amadou.diallo@test-eventflow.app", group: "Amis", status: "CONFIRMED" },
      { firstName: "Fatou", lastName: "Diallo", email: "fatou.diallo@test-eventflow.app", group: "Amis", status: "CONFIRMED" },
      { firstName: "Pierre", lastName: "Lemaire", email: "pierre.lemaire@test-eventflow.app", group: "Collègues", status: "CONFIRMED" },
      { firstName: "Isabelle", lastName: "Martin", email: "isabelle.martin@test-eventflow.app", group: "Famille mariée", status: "CONFIRMED" },
      { firstName: "Kofi", lastName: "Asante", email: "kofi.asante@test-eventflow.app", group: "Amis", status: "CONFIRMED" },
      { firstName: "Aïcha", lastName: "Bamba", email: "aicha.bamba@test-eventflow.app", group: "Amis", status: "CONFIRMED" },
      { firstName: "Thomas", lastName: "Moreau", email: "thomas.moreau@test-eventflow.app", group: "Collègues", status: "CONFIRMED" },
      { firstName: "Sophie", lastName: "Lefèvre", email: "sophie.lefevre@test-eventflow.app", group: "Famille mariée", status: "CONFIRMED" },
      { firstName: "Moussa", lastName: "Traoré", email: "moussa.traore@test-eventflow.app", group: "Amis", status: "CONFIRMED" },
      { firstName: "Claire", lastName: "Bernard", email: "claire.bernard@test-eventflow.app", group: "Famille marié", status: "CONFIRMED" },
      { firstName: "Paul", lastName: "Roux", email: "paul.roux@test-eventflow.app", group: "Collègues", status: "DECLINED" },
      { firstName: "Nathalie", lastName: "Girard", email: "nathalie.girard@test-eventflow.app", group: "Amis", status: "DECLINED" },
      { firstName: "Sékou", lastName: "Camara", email: "sekou.camara@test-eventflow.app", group: "Amis", status: "DECLINED" },
      { firstName: "Julie", lastName: "Petit", email: "julie.petit@test-eventflow.app", group: "Famille mariée", status: "DECLINED" },
      { firstName: "Oumar", lastName: "Sy", email: "oumar.sy@test-eventflow.app", group: "Amis", status: "DECLINED" },
      { firstName: "François", lastName: "Duval", email: "francois.duval@test-eventflow.app", group: "Collègues", status: "INVITED" },
      { firstName: "Aminata", lastName: "Koné", email: "aminata.kone@test-eventflow.app", group: "Amis", status: "INVITED" },
      { firstName: "Laurent", lastName: "Blanc", email: "laurent.blanc@test-eventflow.app", group: "Famille marié", status: "INVITED" },
      { firstName: "Djamilah", lastName: "Ouattara", email: "djamilah.ouattara@test-eventflow.app", group: "Amis", status: "INVITED" },
      { firstName: "Michel", lastName: "Robert", email: "michel.robert@test-eventflow.app", group: "Collègues", status: "INVITED" },
      { firstName: "Suzanne", lastName: "Faure", email: "suzanne.faure@test-eventflow.app", group: "Famille mariée", status: "INVITED" },
      { firstName: "Yves", lastName: "André", email: "yves.andre@test-eventflow.app", group: "Amis", status: "INVITED" },
      { firstName: "Bakary", lastName: "Coulibaly", email: "bakary.coulibaly@test-eventflow.app", group: "Amis", status: "INVITED" },
      { firstName: "Denis", lastName: "Morel", email: "denis.morel@test-eventflow.app", group: "Collègues", status: "ABSENT" },
      { firstName: "Adama", lastName: "Diarra", email: "adama.diarra@test-eventflow.app", group: "Amis", status: "ABSENT" },
      { firstName: "Catherine", lastName: "Leroy", email: "catherine.leroy@test-eventflow.app", group: "Famille mariée", status: "ABSENT" },
      { firstName: "Ibrahima", lastName: "Sow", email: "ibrahima.sow@test-eventflow.app", group: "Amis", status: "ABSENT" },
      { firstName: "Anne", lastName: "Mercier", email: "anne.mercier@test-eventflow.app", group: "Famille marié", status: "ABSENT" },
    ],
    chatMessages: [
      { content: "Trop hâte pour le grand jour ! 🎉", senderIndex: 0 },
      { content: "Est-ce qu'il y a un dress code particulier ?", senderIndex: 2 },
      { content: "Oui, tenue de soirée chic ! Costumes sombres et robes longues 👗", senderIndex: 0 },
      { content: "Merci ! On a réservé un hôtel pas loin du château", senderIndex: 3 },
      { content: "Super ! N'oubliez pas vos chaussures de danse 💃", senderIndex: 5 },
      { content: "Quelqu'un fait du covoiturage depuis Paris ?", senderIndex: 4 },
      { content: "Oui ! On peut partir de la Gare Montparnasse, qui est intéressé ?", senderIndex: 6 },
      { content: "Nous ! On sera 2 adultes + 1 enfant 🙋‍♀️", senderIndex: 7 },
    ],
  },

  // ─── Anniversaire ─────────────────────────────────────────
  {
    slug: "demo-anniversaire-50ans-kone",
    title: "Les 50 ans de Mamadou Koné",
    type: "ANNIVERSAIRE",
    date: daysFromNow(30),
    location: "Salle des Fêtes de Créteil, 94000",
    description: "Venez fêter le demi-siècle d'un homme exceptionnel !",
    visibility: "SEMI_PRIVATE",
    ownerEmail: "demo-anniversaire@eventflow.app",
    themePreset: "anniversaire",
    modules: [
      { type: "MOD_INVITE", order: 1, active: true },
      { type: "MOD_RSVP", order: 2, active: true },
      { type: "MOD_MENU", order: 3, active: true, configJson: { menus: ["Menu Festif", "Menu Végétarien", "Menu Enfant"] } },
      { type: "MOD_PROGRAMME", order: 4, active: true, configJson: { steps: [
        { time: "18:00", title: "Accueil", description: "Accueil des invités et cocktail de bienvenue" },
        { time: "19:30", title: "Repas", description: "Grand buffet africain et européen" },
        { time: "21:00", title: "Discours & Hommages", description: "Mots de la famille et des amis proches" },
        { time: "22:00", title: "Danse", description: "Soirée dansante avec DJ live et percussions" },
      ] } },
      { type: "MOD_GALERIE", order: 5, active: true, configJson: { photos: [
        "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800",
        "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=800",
        "https://images.unsplash.com/photo-1504196606672-aef5c9cefc92?w=800",
        "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800",
      ] } },
      { type: "MOD_DASHBOARD", order: 6, active: true },
    ],
    guests: [
      { firstName: "Mamadou", lastName: "Koné", email: "mamadou.kone@test-eventflow.app", group: "Famille", status: "CONFIRMED" },
      { firstName: "Fatoumata", lastName: "Koné", email: "fatoumata.kone@test-eventflow.app", group: "Famille", status: "CONFIRMED" },
      { firstName: "Seydou", lastName: "Diop", email: "seydou.diop@test-eventflow.app", group: "Amis", status: "CONFIRMED" },
      { firstName: "Mariam", lastName: "Touré", email: "mariam.toure@test-eventflow.app", group: "Amis", status: "CONFIRMED" },
      { firstName: "Olivier", lastName: "Fournier", email: "olivier.fournier@test-eventflow.app", group: "Collègues", status: "CONFIRMED" },
      { firstName: "Aïssata", lastName: "Barry", email: "aissata.barry@test-eventflow.app", group: "Famille", status: "CONFIRMED" },
      { firstName: "Abdoulaye", lastName: "Ndiaye", email: "abdoulaye.ndiaye@test-eventflow.app", group: "Amis", status: "CONFIRMED" },
      { firstName: "Christine", lastName: "Dubois", email: "christine.dubois@test-eventflow.app", group: "Collègues", status: "CONFIRMED" },
      { firstName: "Boubacar", lastName: "Cissé", email: "boubacar.cisse@test-eventflow.app", group: "Amis", status: "CONFIRMED" },
      { firstName: "Nadège", lastName: "Philippe", email: "nadege.philippe@test-eventflow.app", group: "Famille", status: "CONFIRMED" },
      { firstName: "Dramane", lastName: "Sangaré", email: "dramane.sangare@test-eventflow.app", group: "Amis", status: "CONFIRMED" },
      { firstName: "Émilie", lastName: "Leroux", email: "emilie.leroux@test-eventflow.app", group: "Collègues", status: "CONFIRMED" },
      { firstName: "Modibo", lastName: "Keïta", email: "modibo.keita@test-eventflow.app", group: "Amis", status: "CONFIRMED" },
      { firstName: "Sandrine", lastName: "Vidal", email: "sandrine.vidal@test-eventflow.app", group: "Famille", status: "CONFIRMED" },
      { firstName: "Lamine", lastName: "Fall", email: "lamine.fall@test-eventflow.app", group: "Amis", status: "CONFIRMED" },
      { firstName: "Rachid", lastName: "Benali", email: "rachid.benali@test-eventflow.app", group: "Amis", status: "DECLINED" },
      { firstName: "Valérie", lastName: "Morin", email: "valerie.morin@test-eventflow.app", group: "Collègues", status: "DECLINED" },
      { firstName: "Cheikh", lastName: "Mbaye", email: "cheikh.mbaye@test-eventflow.app", group: "Amis", status: "DECLINED" },
      { firstName: "Ousmane", lastName: "Dembélé", email: "ousmane.dembele@test-eventflow.app", group: "Famille", status: "INVITED" },
      { firstName: "Nathalie", lastName: "Simon", email: "nathalie.simon@test-eventflow.app", group: "Collègues", status: "INVITED" },
    ],
  },

  // ─── Deuil ────────────────────────────────────────────────
  {
    slug: "demo-deuil-famille-mbeki",
    title: "En mémoire de Jean-Pierre Mbeki",
    type: "DEUIL",
    date: daysFromNow(7),
    location: "Église Saint-Joseph, Montreuil 93100",
    description: "La famille Mbeki vous convie à une cérémonie de recueillement en hommage à Jean-Pierre.",
    visibility: "SEMI_PRIVATE",
    ownerEmail: "demo-deuil@eventflow.app",
    themePreset: "deuil",
    modules: [
      { type: "MOD_INVITE", order: 1, active: true },
      { type: "MOD_RSVP", order: 2, active: true },
      { type: "MOD_PROGRAMME", order: 3, active: true, configJson: { steps: [
        { time: "10:00", title: "Arrivée", description: "Accueil des familles et proches" },
        { time: "10:30", title: "Cérémonie religieuse", description: "Office célébré par le Père Antoine" },
        { time: "13:00", title: "Repas de famille", description: "Déjeuner au restaurant La Bonne Table, Montreuil" },
      ] } },
      { type: "MOD_DASHBOARD", order: 4, active: true },
    ],
    guests: [
      { firstName: "Paul", lastName: "Mbeki", email: "paul.mbeki@test-eventflow.app", group: "Famille", status: "CONFIRMED" },
      { firstName: "Rose", lastName: "Mbeki", email: "rose.mbeki@test-eventflow.app", group: "Famille", status: "CONFIRMED" },
      { firstName: "Étienne", lastName: "Mbeki", email: "etienne.mbeki@test-eventflow.app", group: "Famille", status: "CONFIRMED" },
      { firstName: "Marie-Thérèse", lastName: "Mbeki", email: "mt.mbeki@test-eventflow.app", group: "Famille", status: "CONFIRMED" },
      { firstName: "Joseph", lastName: "Nguema", email: "joseph.nguema@test-eventflow.app", group: "Famille élargie", status: "CONFIRMED" },
      { firstName: "Cécile", lastName: "Ondo", email: "cecile.ondo@test-eventflow.app", group: "Famille élargie", status: "CONFIRMED" },
      { firstName: "Bernard", lastName: "Essono", email: "bernard.essono@test-eventflow.app", group: "Amis proches", status: "CONFIRMED" },
      { firstName: "Jeanne", lastName: "Mba", email: "jeanne.mba@test-eventflow.app", group: "Amis proches", status: "CONFIRMED" },
      { firstName: "Alain", lastName: "Obame", email: "alain.obame@test-eventflow.app", group: "Collègues", status: "CONFIRMED" },
      { firstName: "Françoise", lastName: "Nze", email: "francoise.nze@test-eventflow.app", group: "Communauté", status: "CONFIRMED" },
      { firstName: "Michel", lastName: "Biyoghe", email: "michel.biyoghe@test-eventflow.app", group: "Communauté", status: "DECLINED" },
      { firstName: "Thérèse", lastName: "Engone", email: "therese.engone@test-eventflow.app", group: "Famille élargie", status: "DECLINED" },
      { firstName: "Gabriel", lastName: "Nkoghe", email: "gabriel.nkoghe@test-eventflow.app", group: "Amis proches", status: "INVITED" },
      { firstName: "Hélène", lastName: "Mintsa", email: "helene.mintsa@test-eventflow.app", group: "Famille élargie", status: "INVITED" },
      { firstName: "Patrick", lastName: "Ebo", email: "patrick.ebo@test-eventflow.app", group: "Communauté", status: "INVITED" },
    ],
  },

  // ─── Conférence ───────────────────────────────────────────
  {
    slug: "demo-conference-techsummit-2026",
    title: "TechSummit Paris 2026",
    type: "CONFERENCE",
    date: daysFromNow(60),
    location: "Palais des Congrès, Paris 75017",
    description: "La conférence tech de référence en Europe. 20 speakers, 2 jours, 1 vision.",
    visibility: "PUBLIC",
    ownerEmail: "demo-conference@eventflow.app",
    themePreset: "conference",
    modules: [
      { type: "MOD_INVITE", order: 1, active: true },
      { type: "MOD_RSVP", order: 2, active: true },
      { type: "MOD_QR", order: 3, active: true },
      { type: "MOD_PROGRAMME", order: 4, active: true, configJson: { steps: [
        { time: "09:00", title: "Keynote d'ouverture", description: "Vision IA 2026 — par Dr. Sarah Chen" },
        { time: "10:30", title: "Track 1 : Cloud & DevOps", description: "Kubernetes, serverless et edge computing" },
        { time: "10:30", title: "Track 2 : IA & Machine Learning", description: "LLMs, vision par ordinateur, éthique IA" },
        { time: "10:30", title: "Track 3 : Web & Mobile", description: "React 20, Flutter 5, Progressive Web Apps" },
        { time: "12:30", title: "Déjeuner Networking", description: "Buffet et espace networking au niveau 2" },
        { time: "14:00", title: "Ateliers pratiques", description: "Hands-on labs en petits groupes (inscription sur place)" },
        { time: "16:30", title: "Panel de clôture", description: "Table ronde : L'avenir du développement en Afrique" },
        { time: "18:00", title: "Cocktail de clôture", description: "Networking, stands partenaires et tirage au sort" },
      ], speakers: [
        { name: "Dr. Sarah Chen", title: "Chief AI Officer, DeepTech Labs", bio: "Pionnière de l'IA responsable, 15 ans d'expérience" },
        { name: "Kwame Asante", title: "CTO, AfriCloud", bio: "Expert infrastructure cloud pour l'Afrique" },
        { name: "Marie Lefèvre", title: "VP Engineering, DataPulse", bio: "Spécialiste DevOps et architecture distribuée" },
        { name: "Omar Benali", title: "Founder, CodeForAll", bio: "Éducateur tech, 50K+ étudiants formés" },
        { name: "Amara Diop", title: "Lead ML Engineer, NeuroSoft", bio: "Recherche en NLP multilingue africain" },
        { name: "Lucas Weber", title: "Principal Architect, CloudScale", bio: "Architecte systèmes à grande échelle" },
      ] } },
      { type: "MOD_CHAT", order: 5, active: true },
      { type: "MOD_DASHBOARD", order: 6, active: true },
    ],
    guests: generateConferenceGuests(50),
    chatMessages: [
      { content: "Super excité pour le keynote de Dr. Chen ! 🚀", senderIndex: 0 },
      { content: "Quelqu'un a des recommandations d'hôtels près du Palais des Congrès ?", senderIndex: 2 },
      { content: "Le Hyatt Regency est juste à côté, très pratique !", senderIndex: 5 },
      { content: "Est-ce que les ateliers sont inclus dans le pass ?", senderIndex: 3 },
      { content: "Oui, tout est inclus ! Premier arrivé, premier servi pour les labs", senderIndex: 0 },
      { content: "J'aimerais bien rencontrer d'autres devs qui bossent sur du NLP 🤖", senderIndex: 8 },
      { content: "Moi ! On pourra se retrouver pendant le networking lunch", senderIndex: 10 },
      { content: "Qui est déjà venu l'année dernière ? Comment c'était ?", senderIndex: 7 },
      { content: "C'était incroyable ! La qualité des talks a vraiment augmenté", senderIndex: 1 },
      { content: "Pensez à télécharger l'app pour scanner les QR codes 📱", senderIndex: 0 },
      { content: "Cool ! Est-ce qu'il y aura du live streaming pour ceux qui ne peuvent pas venir ?", senderIndex: 15 },
      { content: "Oui, toutes les conférences seront streamées en direct sur YouTube", senderIndex: 0 },
    ],
  },

  // ─── Baptême ──────────────────────────────────────────────
  {
    slug: "demo-bapteme-eden-traore",
    title: "Baptême d'Eden Traoré",
    type: "BAPTEME",
    date: daysFromNow(45),
    location: "Paroisse Saint-Michel, Bobigny 93000",
    description: "Partagez avec nous la joie de l'entrée dans la foi de notre petit Eden.",
    visibility: "SEMI_PRIVATE",
    ownerEmail: "demo-bapteme@eventflow.app",
    themePreset: "bapteme",
    modules: [
      { type: "MOD_INVITE", order: 1, active: true },
      { type: "MOD_RSVP", order: 2, active: true },
      { type: "MOD_MENU", order: 3, active: true, configJson: { menus: ["Repas de Fête", "Menu Végétarien", "Menu Bébé"] } },
      { type: "MOD_GALERIE", order: 4, active: true, configJson: { photos: [
        "https://images.unsplash.com/photo-1519689680058-324335c77eba?w=800",
        "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=800",
        "https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?w=800",
      ] } },
      { type: "MOD_DASHBOARD", order: 5, active: true },
    ],
    guests: [
      { firstName: "Jonathan", lastName: "Traoré", email: "jonathan.traore@test-eventflow.app", group: "Parents", status: "CONFIRMED" },
      { firstName: "Amina", lastName: "Traoré", email: "amina.traore@test-eventflow.app", group: "Parents", status: "CONFIRMED" },
      { firstName: "Grand-père", lastName: "Traoré", email: "gp.traore@test-eventflow.app", group: "Grands-parents", status: "CONFIRMED" },
      { firstName: "Grand-mère", lastName: "Traoré", email: "gm.traore@test-eventflow.app", group: "Grands-parents", status: "CONFIRMED" },
      { firstName: "Mariame", lastName: "Konaté", email: "mariame.konate@test-eventflow.app", group: "Famille maternelle", status: "CONFIRMED" },
      { firstName: "Abdoul", lastName: "Traoré", email: "abdoul.traore@test-eventflow.app", group: "Oncle & Tante", status: "CONFIRMED" },
      { firstName: "Fanta", lastName: "Diakité", email: "fanta.diakite@test-eventflow.app", group: "Parrain/Marraine", status: "CONFIRMED" },
      { firstName: "David", lastName: "Blanc", email: "david.blanc@test-eventflow.app", group: "Parrain/Marraine", status: "CONFIRMED" },
      { firstName: "Solène", lastName: "Perrin", email: "solene.perrin@test-eventflow.app", group: "Amis", status: "CONFIRMED" },
      { firstName: "Karim", lastName: "Sané", email: "karim.sane@test-eventflow.app", group: "Famille élargie", status: "DECLINED" },
      { firstName: "Pascale", lastName: "Masson", email: "pascale.masson@test-eventflow.app", group: "Amis", status: "INVITED" },
      { firstName: "Ibrahima", lastName: "Baldé", email: "ibrahima.balde@test-eventflow.app", group: "Famille élargie", status: "INVITED" },
    ],
  },
];

// ─── Helper: Generate Conference Guests ─────────────────────

function generateConferenceGuests(count: number): DemoEvent["guests"] {
  const firstNames = [
    "Alexandre", "Fatima", "Jean-Baptiste", "Awa", "Nicolas", "Khadija", "Philippe", "Mariame",
    "Christophe", "Aïcha", "Stéphane", "Rokia", "Guillaume", "Salimata", "Julien", "Bintou",
    "Sébastien", "Aminata", "Romain", "Djeneba", "Maxime", "Fatoumata", "Benoît", "Oumou",
    "Éric", "Hawa", "Vincent", "Kadiatou", "Frédéric", "Adja", "Mathieu", "Coumba",
    "Antoine", "Mariam", "Raphaël", "Sira", "Thibaut", "Nana", "Arnaud", "Issa",
    "Charles", "Maimouna", "Damien", "Assétou", "Yannick", "Djénéba", "Cédric", "Rama",
    "Florian", "Safiatou"
  ];
  const lastNames = [
    "Lefèvre", "Diallo", "Moreau", "Touré", "Gautier", "Keïta", "Perrin", "Traoré",
    "Lambert", "Coulibaly", "Durand", "Cissé", "Fontaine", "Diop", "Rousseau", "Camara",
    "Marchand", "Konaté", "Chevalier", "Bah", "Giraud", "Sangaré", "Lemoine", "Dembélé",
    "Masson", "Sylla", "Fabre", "Sissoko", "Carpentier", "Ndiaye", "Berger", "Fall",
    "André", "Sow", "Joly", "Barry", "Leclerc", "Sacko", "Colin", "Doumbia",
    "Rivière", "Koné", "Marie", "Ouattara", "Aubert", "Sidibé", "Renaud", "Dia",
    "Picard", "Dramé"
  ];

  const guests: DemoEvent["guests"] = [];
  for (let i = 0; i < count; i++) {
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[i % lastNames.length];
    const groups = ["Speakers", "VIP", "Standard", "Presse", "Partenaires"];
    let status: GuestStatus;
    if (i < 35) status = "CONFIRMED";
    else if (i < 43) status = "DECLINED";
    else status = "INVITED";

    guests.push({
      firstName: fn,
      lastName: ln,
      email: `${fn.toLowerCase().replace(/[éèê]/g, "e").replace(/[àâ]/g, "a").replace(/[ïî]/g, "i").replace(/[ô]/g, "o")}.${ln.toLowerCase().replace(/[éèê]/g, "e").replace(/[ïî]/g, "i")}@test-eventflow.app`,
      group: groups[i % groups.length],
      status,
    });
  }
  return guests;
}

// ─── RSVP Messages ──────────────────────────────────────────

const RSVP_MESSAGES_POSITIVE = [
  "Nous avons hâte d'être là ! 🎉",
  "Ce sera un honneur d'être présent !",
  "Vivement ce beau jour !",
  "On ne manquerait ça pour rien au monde !",
  "Merci pour l'invitation, nous serons là avec plaisir.",
  "Quelle joie ! Nous comptons les jours.",
  "Nous serons présents et impatients de vous revoir.",
  "Merci de nous inclure dans ce moment spécial.",
  "Nous sommes très touchés et serons là.",
  "C'est avec grand plaisir que nous confirmons notre présence !",
];

const RSVP_MESSAGES_NEGATIVE = [
  "Nous serons de tout cœur avec vous.",
  "Hélas, nous ne pourrons pas être présents mais nous pensons à vous.",
  "Avec regret, un empêchement ne nous permet pas de venir.",
  "Nous vous souhaitons une magnifique journée.",
];

const ALLERGIES_LIST = [
  [], [], [], [], [], // Most people have no allergies
  ["gluten"],
  ["lactose"],
  ["arachides"],
  ["fruits de mer"],
  ["gluten", "lactose"],
];

// ─── Main Seed Function ─────────────────────────────────────

async function main() {
  console.log("🌱 Seeding demo data...\n");

  // 1. Create demo users
  console.log("👤 Creating demo users...");
  const userMap: Record<string, string> = {};

  for (const u of DEMO_USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        plan: u.plan,
        isDemoAccount: true,
        demoAccountType: u.demoAccountType,
      },
      create: {
        email: u.email,
        name: u.name,
        password: DEMO_PASSWORD_HASH,
        role: u.role,
        plan: u.plan,
        isDemoAccount: true,
        demoAccountType: u.demoAccountType,
      },
    });
    userMap[u.email] = user.id;
    console.log(`  ✅ ${u.name} (${u.email}) — ${u.plan}/${u.role}`);
  }

  // 2. Create GlobalConfig if not exists
  console.log("\n⚙️ Creating global config...");
  await prisma.globalConfig.upsert({
    where: { id: "global" },
    update: {},
    create: {
      id: "global",
      maintenanceMode: false,
      newRegistrations: true,
      demoEnabled: true,
    },
  });
  console.log("  ✅ GlobalConfig created");

  // 3. Create demo events
  for (const evtDef of DEMO_EVENTS) {
    console.log(`\n📅 Creating event: ${evtDef.title}...`);
    const userId = userMap[evtDef.ownerEmail];
    if (!userId) {
      console.error(`  ❌ Owner not found: ${evtDef.ownerEmail}`);
      continue;
    }

    // Upsert event
    const event = await prisma.event.upsert({
      where: { slug: evtDef.slug },
      update: {
        title: evtDef.title,
        type: evtDef.type,
        date: evtDef.date,
        location: evtDef.location,
        description: evtDef.description,
        visibility: evtDef.visibility,
        status: "PUBLISHED",
      },
      create: {
        slug: evtDef.slug,
        title: evtDef.title,
        type: evtDef.type,
        date: evtDef.date,
        location: evtDef.location,
        description: evtDef.description,
        status: "PUBLISHED",
        visibility: evtDef.visibility,
        userId,
      },
    });
    console.log(`  ✅ Event: ${event.title} (/${event.slug})`);

    // Upsert theme
    const themeData = THEME_PRESETS[evtDef.themePreset];
    if (themeData) {
      await prisma.eventTheme.upsert({
        where: { eventId: event.id },
        update: { ...themeData },
        create: { eventId: event.id, ...themeData },
      });
      console.log(`  ✅ Theme: ${evtDef.themePreset}`);
    }

    // Upsert modules
    for (const mod of evtDef.modules) {
      await prisma.eventModule.upsert({
        where: { eventId_type: { eventId: event.id, type: mod.type } },
        update: { order: mod.order, active: mod.active, configJson: mod.configJson || {} },
        create: {
          eventId: event.id,
          type: mod.type,
          order: mod.order,
          active: mod.active,
          configJson: mod.configJson || {},
        },
      });
    }
    console.log(`  ✅ Modules: ${evtDef.modules.length}`);

    // Delete existing demo guests for this event, then recreate
    await prisma.guest.deleteMany({
      where: {
        eventId: event.id,
        email: { endsWith: "@test-eventflow.app" },
      },
    });

    // Create guests + RSVPs
    const guestIds: string[] = [];
    for (const gDef of evtDef.guests) {
      const guest = await prisma.guest.create({
        data: {
          eventId: event.id,
          firstName: gDef.firstName,
          lastName: gDef.lastName,
          email: gDef.email,
          group: gDef.group,
          status: gDef.status,
        },
      });
      guestIds.push(guest.id);

      // Create RSVP for CONFIRMED/DECLINED
      if (gDef.status === "CONFIRMED" || gDef.status === "DECLINED") {
        const isConfirmed = gDef.status === "CONFIRMED";
        const menuChoices = evtDef.modules
          .find((m) => m.type === "MOD_MENU")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ?.configJson as { menus?: any[] } | undefined;
        const rawMenus = menuChoices?.menus || ["Classique"];
        // Handle both string[] (old format) and {name: string}[] (new format)
        const menus: string[] = rawMenus.map((m: unknown) => typeof m === "string" ? m : (m as { name: string }).name);

        await prisma.rSVP.create({
          data: {
            guestId: guest.id,
            presence: isConfirmed,
            adultCount: isConfirmed ? Math.floor(Math.random() * 2) + 1 : 1,
            childrenCount: isConfirmed ? Math.floor(Math.random() * 2) : 0,
            menuChoice: isConfirmed ? menus[Math.floor(Math.random() * menus.length)] : null,
            allergies: ALLERGIES_LIST[Math.floor(Math.random() * ALLERGIES_LIST.length)],
            message: isConfirmed
              ? RSVP_MESSAGES_POSITIVE[Math.floor(Math.random() * RSVP_MESSAGES_POSITIVE.length)]
              : RSVP_MESSAGES_NEGATIVE[Math.floor(Math.random() * RSVP_MESSAGES_NEGATIVE.length)],
            submittedAt: daysAgo(Math.floor(Math.random() * 28) + 2),
          },
        });
      }
    }
    console.log(`  ✅ Guests: ${evtDef.guests.length} (with RSVPs)`);

    // Create chat messages if any
    if (evtDef.chatMessages && evtDef.chatMessages.length > 0) {
      // Delete existing demo chat messages
      await prisma.chatMessage.deleteMany({
        where: { eventId: event.id },
      });

      for (let i = 0; i < evtDef.chatMessages.length; i++) {
        const msg = evtDef.chatMessages[i];
        // Use a demo user as sender (cycle through available demo users)
        const senderEmail = DEMO_USERS[msg.senderIndex % DEMO_USERS.length].email;
        const senderId = userMap[senderEmail];
        if (senderId) {
          await prisma.chatMessage.create({
            data: {
              eventId: event.id,
              userId: senderId,
              channel: "general",
              content: msg.content,
              type: "TEXT",
              createdAt: daysAgo(30 - i * 2),
            },
          });
        }
      }
      console.log(`  ✅ Chat: ${evtDef.chatMessages.length} messages`);
    }
  }

  console.log("\n🎉 Demo seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
