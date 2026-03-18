import { EventType, ModuleType, Plan } from "@prisma/client";

// ─── Event Types Configuration ─────────────────────────────

export const EVENT_TYPES: Record<
  EventType,
  { label: string; icon: string; description: string; color: string }
> = {
  MARIAGE: {
    label: "Mariage",
    icon: "💍",
    description: "Célébration d'amour et d'engagement",
    color: "#C48B90",
  },
  ANNIVERSAIRE: {
    label: "Anniversaire",
    icon: "🎂",
    description: "Fête de naissance et célébration",
    color: "#E8734A",
  },
  DEUIL: {
    label: "Cérémonie funèbre",
    icon: "🕊️",
    description: "Recueillement et hommage",
    color: "#6B7280",
  },
  BAPTEME: {
    label: "Baptême",
    icon: "👶",
    description: "Accueil et bénédiction",
    color: "#93C5FD",
  },
  CONFERENCE: {
    label: "Conférence",
    icon: "🎤",
    description: "Événement professionnel et réseautage",
    color: "#1E3A5F",
  },
  PRIVE: {
    label: "Fête privée",
    icon: "✨",
    description: "Événement exclusif sur invitation",
    color: "#C9A96E",
  },
};

// ─── Module Types Configuration ─────────────────────────────

export const MODULE_TYPES: Record<
  ModuleType,
  {
    label: string;
    icon: string;
    description: string;
    planRequired: Plan;
    alwaysActive?: boolean;
  }
> = {
  MOD_INVITE: {
    label: "Page d'invitation",
    icon: "📄",
    description: "Page principale de présentation de l'événement",
    planRequired: "FREE",
    alwaysActive: true,
  },
  MOD_RSVP: {
    label: "RSVP & Confirmation",
    icon: "✅",
    description: "Formulaire de confirmation de présence",
    planRequired: "FREE",
  },
  MOD_MENU: {
    label: "Menu & Allergies",
    icon: "🍽️",
    description: "Sélection du repas et gestion des allergies",
    planRequired: "FREE",
  },
  MOD_QR: {
    label: "QR Code & Accès",
    icon: "📱",
    description: "QR code unique par invité pour contrôle d'entrée",
    planRequired: "ESSENTIEL",
  },
  MOD_LOGISTIQUE: {
    label: "Logistique",
    icon: "🚗",
    description: "Transport, hébergement et besoins spéciaux",
    planRequired: "ESSENTIEL",
  },
  MOD_CHAT: {
    label: "Chat interne",
    icon: "💬",
    description: "Communication en temps réel",
    planRequired: "PREMIUM",
  },
  MOD_PROGRAMME: {
    label: "Programme & Timeline",
    icon: "📋",
    description: "Déroulement chronologique de l'événement",
    planRequired: "ESSENTIEL",
  },
  MOD_GALERIE: {
    label: "Galerie & Médias",
    icon: "📷",
    description: "Partage de photos avant, pendant et après",
    planRequired: "ESSENTIEL",
  },
  MOD_DASHBOARD: {
    label: "Tableau de bord",
    icon: "📊",
    description: "Vue d'ensemble et analytiques",
    planRequired: "FREE",
    alwaysActive: true,
  },
};

// ─── Plan Limits ────────────────────────────────────────────

export const PLAN_LIMITS: Record<
  Plan,
  {
    label: string;
    maxEvents: number;
    maxGuests: number;
    modules: ModuleType[] | "all";
    qrCode: boolean;
    chat: boolean;
    customDomain: boolean;
    watermark: boolean;
    price: number | null;
    color: string;
  }
> = {
  FREE: {
    label: "Gratuit",
    maxEvents: 1,
    maxGuests: 50,
    modules: [ModuleType.MOD_INVITE, ModuleType.MOD_RSVP, ModuleType.MOD_MENU],
    qrCode: false,
    chat: false,
    customDomain: false,
    watermark: true,
    price: 0,
    color: "#9CA3AF",
  },
  ESSENTIEL: {
    label: "Essentiel",
    maxEvents: 3,
    maxGuests: 200,
    modules: [
      ModuleType.MOD_INVITE,
      ModuleType.MOD_RSVP,
      ModuleType.MOD_MENU,
      ModuleType.MOD_QR,
      ModuleType.MOD_PROGRAMME,
      ModuleType.MOD_GALERIE,
    ],
    qrCode: true,
    chat: false,
    customDomain: false,
    watermark: false,
    price: 9,
    color: "#3B82F6",
  },
  PREMIUM: {
    label: "Premium",
    maxEvents: Infinity,
    maxGuests: 1000,
    modules: "all",
    qrCode: true,
    chat: true,
    customDomain: true,
    watermark: false,
    price: 29,
    color: "#C9A96E",
  },
  ENTREPRISE: {
    label: "Entreprise",
    maxEvents: Infinity,
    maxGuests: Infinity,
    modules: "all",
    qrCode: true,
    chat: true,
    customDomain: true,
    watermark: false,
    price: null,
    color: "#7C3AED",
  },
};

// ─── Currency System ────────────────────────────────────────

export interface Currency {
  code: string;
  symbol: string;
  label: string;
  flag: string;
  rate: number; // rate relative to EUR (1 EUR = X currency)
  decimals: number;
}

export const CURRENCIES: Currency[] = [
  { code: "EUR", symbol: "€", label: "Euro", flag: "🇪🇺", rate: 1, decimals: 2 },
  { code: "USD", symbol: "$", label: "Dollar US", flag: "🇺🇸", rate: 1.08, decimals: 2 },
  { code: "XAF", symbol: "FCFA", label: "Franc CFA", flag: "🇬🇦", rate: 655.957, decimals: 0 },
  { code: "CDF", symbol: "FC", label: "Franc congolais", flag: "🇨🇩", rate: 2800, decimals: 0 },
  { code: "NGN", symbol: "₦", label: "Naira", flag: "🇳🇬", rate: 1700, decimals: 0 },
];

export function convertPrice(priceEur: number, currency: Currency): number {
  const converted = priceEur * currency.rate;
  if (currency.decimals === 0) {
    // Round to nearest 500 for clean local prices
    return Math.round(converted / 500) * 500;
  }
  return Math.round(converted * 100) / 100;
}

function formatNumber(n: number, decimals: number): string {
  if (decimals === 0) {
    // Deterministic thousands separator (space) - no locale dependency
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }
  return n.toFixed(2).replace(".", ",");
}

export function formatPrice(price: number, currency: Currency): string {
  if (price === 0) return "Gratuit";
  const formatted = formatNumber(price, currency.decimals);

  // Symbol position depends on currency
  if (currency.code === "EUR") return `${formatted} €`;
  if (currency.code === "USD") return `$${formatted}`;
  return `${formatted} ${currency.symbol}`;
}

// ─── Wedding Invitation Tiers ───────────────────────────────

export interface InvitationTier {
  id: string;
  label: string;
  subtitle: string;
  price: number; // in EUR
  minGuests: number;
  maxGuests: number;
  color: string;
  features: string[];
  popular?: boolean;
}

export const INVITATION_TIERS: InvitationTier[] = [
  {
    id: "decouverte",
    label: "Découverte",
    subtitle: "Mariage intime",
    price: 0,
    minGuests: 1,
    maxGuests: 15,
    color: "#9CA3AF",
    features: [
      "Carte d'invitation digitale",
      "RSVP en ligne",
      "QR Code basique",
      "1 page d'accueil",
      "Filigrane EventFlow",
    ],
  },
  {
    id: "essentiel",
    label: "Essentiel",
    subtitle: "Petit mariage",
    price: 19.99,
    minGuests: 16,
    maxGuests: 30,
    color: "#3B82F6",
    features: [
      "Carte personnalisée",
      "RSVP + QR Code",
      "Programme de la journée",
      "Menu du repas",
      "Sans filigrane",
    ],
  },
  {
    id: "confort",
    label: "Confort",
    subtitle: "Mariage classique",
    price: 39.99,
    minGuests: 31,
    maxGuests: 50,
    color: "#06B6D4",
    features: [
      "Tous les modules",
      "Galerie photos des mariés",
      "Infos pratiques (accès, hôtels)",
      "Chat en direct",
      "Thème personnalisable",
    ],
  },
  {
    id: "premium",
    label: "Premium",
    subtitle: "Grande célébration",
    price: 99.99,
    minGuests: 51,
    maxGuests: 100,
    color: "#8B5CF6",
    features: [
      "Tous les modules",
      "Scanner QR à l'entrée",
      "Gestion des tables / groupes",
      "Programme multi-cérémonies",
      "Support par email 48h",
    ],
    popular: true,
  },
  {
    id: "prestige",
    label: "Prestige",
    subtitle: "Mariage d'exception",
    price: 199.99,
    minGuests: 101,
    maxGuests: 250,
    color: "#C9A96E",
    features: [
      "Tout le plan Premium",
      "Personnalisation complète",
      "Menu avec choix par invité",
      "Logistique détaillée (navettes, parkings)",
      "Support prioritaire 24h",
    ],
  },
  {
    id: "royal",
    label: "Royal",
    subtitle: "Grand mariage",
    price: 299.99,
    minGuests: 251,
    maxGuests: 500,
    color: "#F59E0B",
    features: [
      "Tout le plan Prestige",
      "Multi-événements (civil + religieux + réception)",
      "Domaine personnalisé",
      "Gestion des accompagnants",
      "Coordinateur dédié",
    ],
  },
  {
    id: "imperial",
    label: "Impérial",
    subtitle: "Mariage grandiose",
    price: 599.99,
    minGuests: 501,
    maxGuests: 1000,
    color: "#EF4444",
    features: [
      "Tout le plan Royal",
      "Multi-jours (jusqu'à 3 jours)",
      "API Access & intégrations",
      "Statistiques avancées",
      "Account Manager dédié",
    ],
  },
  {
    id: "legendaire",
    label: "Légendaire",
    subtitle: "Méga mariage",
    price: 999.99,
    minGuests: 1001,
    maxGuests: 2000,
    color: "#7C3AED",
    features: [
      "Tout illimité",
      "Multi-jours illimité",
      "API + Webhooks",
      "Application mobile dédiée",
      "SLA garantie + support 24/7",
    ],
  },
];

// ─── Effect Registry ────────────────────────────────────────

export const ENTRY_EFFECTS = {
  fade_white: {
    id: "fade_white",
    label: "Fondu voilé",
    cssFile: "fade-white.css",
    jsModule: null,
    weight: "css-only" as const,
    reducedMotionFallback: "fade_simple",
    planRequired: "FREE",
  },
  fade_fast: {
    id: "fade_fast",
    label: "Fondu rapide",
    cssFile: "fade-fast.css",
    jsModule: null,
    weight: "css-only" as const,
    reducedMotionFallback: "fade_simple",
    planRequired: "FREE",
  },
  floral_draw: {
    id: "floral_draw",
    label: "Apparition florale",
    cssFile: "floral-draw.css",
    jsModule: "floral-draw.ts",
    weight: "light" as const,
    reducedMotionFallback: "fade_white",
    planRequired: "ESSENTIEL",
  },
  curtain_open: {
    id: "curtain_open",
    label: "Rideau d'ouverture",
    cssFile: "curtain-open.css",
    jsModule: null,
    weight: "css-only" as const,
    reducedMotionFallback: "fade_white",
    planRequired: "ESSENTIEL",
  },
  curtain_confetti: {
    id: "curtain_confetti",
    label: "Rideau & Confettis",
    cssFile: "curtain-open.css",
    jsModule: "confetti.ts",
    weight: "medium" as const,
    reducedMotionFallback: "fade_white",
    planRequired: "PREMIUM",
  },
  morning_mist: {
    id: "morning_mist",
    label: "Brume matinale",
    cssFile: "morning-mist.css",
    jsModule: null,
    weight: "css-only" as const,
    reducedMotionFallback: "fade_white",
    planRequired: "ESSENTIEL",
  },
  candle_reveal: {
    id: "candle_reveal",
    label: "Lumière bougie",
    cssFile: "candle.css",
    jsModule: "candle.ts",
    weight: "light" as const,
    reducedMotionFallback: "fade_white",
    planRequired: "PREMIUM",
  },
};

export const AMBIENT_EFFECTS = {
  floating_petals: {
    id: "floating_petals",
    label: "Pétales flottants",
    cssFile: "petals.css",
    jsModule: "petals-manager.ts",
    weight: "light" as const,
    reducedMotionFallback: "none",
    planRequired: "ESSENTIEL",
  },
  sparkle: {
    id: "sparkle",
    label: "Scintillements",
    cssFile: "sparkle.css",
    jsModule: null,
    weight: "css-only" as const,
    reducedMotionFallback: "none",
    planRequired: "ESSENTIEL",
  },
  bubbles: {
    id: "bubbles",
    label: "Bulles de savon",
    cssFile: "bubbles.css",
    jsModule: null,
    weight: "css-only" as const,
    reducedMotionFallback: "none",
    planRequired: "ESSENTIEL",
  },
  starlight: {
    id: "starlight",
    label: "Étoiles",
    cssFile: "starlight.css",
    jsModule: null,
    weight: "css-only" as const,
    reducedMotionFallback: "none",
    planRequired: "PREMIUM",
  },
  geometric_grid: {
    id: "geometric_grid",
    label: "Grille géométrique",
    cssFile: "geometric-grid.css",
    jsModule: null,
    weight: "css-only" as const,
    reducedMotionFallback: "none",
    planRequired: "FREE",
  },
};

// ─── Guest Status Labels ────────────────────────────────────

export const GUEST_STATUS_LABELS = {
  INVITED: { label: "Invité", color: "#6B7280" },
  SEEN: { label: "Vu", color: "#3B82F6" },
  CONFIRMED: { label: "Confirmé", color: "#10B981" },
  DECLINED: { label: "Décliné", color: "#EF4444" },
  ABSENT: { label: "Absent", color: "#F59E0B" },
};
