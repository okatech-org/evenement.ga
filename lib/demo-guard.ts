import type { Session } from "next-auth";

// ─── Demo Account Constants ─────────────────────────────────

export const DEMO_ACCOUNTS = {
  "mariage-ray-ashly": {
    email: "demo-ray-ashly@eventflow.app",
    name: "Ray & Ashly — Mariage Octobre 2026",
    plan: "PREMIUM" as const,
    role: "ORGANIZER" as const,
    label: "Ray & Ashly — Mariage",
    icon: "🌹",
    description:
      "Découvrez une invitation de mariage complète : RSVP, menus halal/végé, programme 2 jours, QR codes, galerie photos et chat invités.",
    redirectUrl: "/dashboard",
  },
  mariage: {
    email: "demo-mariage@eventflow.app",
    name: "Sophie & Marc Dupont",
    plan: "PREMIUM" as const,
    role: "ORGANIZER" as const,
    label: "Organisateur Mariage",
    icon: "🌹",
    description:
      "Accès complet à tous les modules, tableau de bord, QR scan, chat...",
    redirectUrl: "/dashboard",
  },
  anniversaire: {
    email: "demo-anniversaire@eventflow.app",
    name: "Famille Koné",
    plan: "ESSENTIEL" as const,
    role: "ORGANIZER" as const,
    label: "Organisateur Anniversaire",
    icon: "🎂",
    description:
      "Gestion des invités, RSVP, menus et galerie photos.",
    redirectUrl: "/dashboard",
  },
  deuil: {
    email: "demo-deuil@eventflow.app",
    name: "Famille Mbeki",
    plan: "ESSENTIEL" as const,
    role: "ORGANIZER" as const,
    label: "Organisateur Cérémonie",
    icon: "🕊️",
    description:
      "Gestion sobre et respectueuse d'un événement de recueillement.",
    redirectUrl: "/dashboard",
  },
  conference: {
    email: "demo-conference@eventflow.app",
    name: "TechSummit Paris",
    plan: "PREMIUM" as const,
    role: "ORGANIZER" as const,
    label: "Organisateur Conférence",
    icon: "🎤",
    description:
      "Gestion complète d'une conférence : speakers, programme, QR codes.",
    redirectUrl: "/dashboard",
  },
  bapteme: {
    email: "demo-bapteme@eventflow.app",
    name: "Jonathan & Amina Traoré",
    plan: "FREE" as const,
    role: "ORGANIZER" as const,
    label: "Organisateur Baptême",
    icon: "👶",
    description:
      "Découvrez les fonctionnalités du plan Gratuit.",
    redirectUrl: "/dashboard",
  },
  coorg: {
    email: "demo-coorg@eventflow.app",
    name: "Alex Martin (Co-organisateur)",
    plan: "FREE" as const,
    role: "CO_ORGANIZER" as const,
    label: "Co-Organisateur",
    icon: "🤝",
    description:
      "Vue co-organisateur avec accès partagé au tableau de bord.",
    redirectUrl: "/dashboard",
  },
  invite: {
    email: "demo-invite@eventflow.app",
    name: "Invité Démo",
    plan: "FREE" as const,
    role: "GUEST_PREVIEW" as const,
    label: "Invité (lecture seule)",
    icon: "👁",
    description:
      "Vue invité : consultez une carte d'invitation et répondez au RSVP.",
    redirectUrl: "/demo-mariage-sophie-marc",
  },
  superadmin: {
    email: "superadmin@eventflow.app",
    name: "Admin EventFlow",
    plan: "ENTREPRISE" as const,
    role: "SUPER_ADMIN" as const,
    label: "Super Admin Système",
    icon: "🛡️",
    description:
      "Accès total à l'interface d'administration système.",
    redirectUrl: "/superadmin",
  },
} as const;

export type DemoAccountType = keyof typeof DEMO_ACCOUNTS;

// ─── Demo Guard Functions ───────────────────────────────────

/**
 * Check if the current session belongs to a demo account.
 */
export function isDemoUser(
  session: Session | null
): boolean {
  return session?.user?.isDemoAccount === true;
}

/**
 * Get the list of restrictions for a demo account.
 */
export function getDemoRestrictions(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user: any
): string[] {
  if (!user?.isDemoAccount) return [];

  return [
    "Impossible de changer l'email ou le mot de passe",
    "Impossible de supprimer le compte",
    "Impossible d'ajouter une carte de paiement",
    "Les modifications sont temporaires et réinitialisées chaque nuit",
  ];
}

/**
 * Check if a given action is allowed for demo accounts.
 */
export function isDemoActionAllowed(
  session: Session | null,
  action: string
): boolean {
  if (!isDemoUser(session)) return true;

  const blockedActions = [
    "CHANGE_EMAIL",
    "CHANGE_PASSWORD",
    "DELETE_ACCOUNT",
    "ADD_PAYMENT",
    "MODIFY_PROFILE",
  ];

  return !blockedActions.includes(action);
}

// ─── Demo Password ──────────────────────────────────────────

export const DEMO_PASSWORD = "demo1234";
