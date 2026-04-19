/**
 * Mapping des rôles evenement.ga aux couleurs persona de la charte.
 * Utilisé pour harmoniser avatars, badges, bordures, icônes selon le rôle utilisateur.
 */

export type PersonaKey =
  | "organizer"
  | "guest"
  | "controller"
  | "admin"
  | "moderator";

export interface PersonaTheme {
  key: PersonaKey;
  label: string;
  /** Hex color for the persona */
  color: string;
  /** Tailwind classes pour fond translucide, texte, bordure */
  bgClass: string;
  bgSolidClass: string;
  textClass: string;
  borderClass: string;
  ringClass: string;
  glowShadow: string;
}

export const PERSONA_THEMES: Record<PersonaKey, PersonaTheme> = {
  organizer: {
    key: "organizer",
    label: "Organisateur",
    color: "#10b981",
    bgClass: "bg-persona-organizer/10",
    bgSolidClass: "bg-persona-organizer",
    textClass: "text-persona-organizer",
    borderClass: "border-persona-organizer/30",
    ringClass: "ring-persona-organizer",
    glowShadow: "shadow-[0_0_20px_rgba(16,185,129,0.2)]",
  },
  guest: {
    key: "guest",
    label: "Invité",
    color: "#3b82f6",
    bgClass: "bg-persona-guest/10",
    bgSolidClass: "bg-persona-guest",
    textClass: "text-persona-guest",
    borderClass: "border-persona-guest/30",
    ringClass: "ring-persona-guest",
    glowShadow: "shadow-[0_0_20px_rgba(59,130,246,0.2)]",
  },
  controller: {
    key: "controller",
    label: "Contrôleur",
    color: "#a855f7",
    bgClass: "bg-persona-controller/10",
    bgSolidClass: "bg-persona-controller",
    textClass: "text-persona-controller",
    borderClass: "border-persona-controller/30",
    ringClass: "ring-persona-controller",
    glowShadow: "shadow-[0_0_20px_rgba(168,85,247,0.2)]",
  },
  admin: {
    key: "admin",
    label: "Super Admin",
    color: "#f59e0b",
    bgClass: "bg-persona-admin/10",
    bgSolidClass: "bg-persona-admin",
    textClass: "text-persona-admin",
    borderClass: "border-persona-admin/30",
    ringClass: "ring-persona-admin",
    glowShadow: "shadow-[0_0_20px_rgba(245,158,11,0.2)]",
  },
  moderator: {
    key: "moderator",
    label: "Modérateur",
    color: "#06b6d4",
    bgClass: "bg-persona-moderator/10",
    bgSolidClass: "bg-persona-moderator",
    textClass: "text-persona-moderator",
    borderClass: "border-persona-moderator/30",
    ringClass: "ring-persona-moderator",
    glowShadow: "shadow-[0_0_20px_rgba(6,182,212,0.2)]",
  },
};

/**
 * Mappe un rôle DB (schema `users.role`) vers un persona charte.
 */
export function getPersonaTheme(role?: string | null): PersonaTheme {
  if (!role) return PERSONA_THEMES.guest;
  switch (role) {
    case "ORGANIZER":
    case "CO_ORGANIZER":
      return PERSONA_THEMES.organizer;
    case "MODERATOR":
      return PERSONA_THEMES.moderator;
    case "ADMIN":
    case "SUPER_ADMIN":
      return PERSONA_THEMES.admin;
    case "CONTROLLER":
      return PERSONA_THEMES.controller;
    case "GUEST":
    case "GUEST_PREVIEW":
    default:
      return PERSONA_THEMES.guest;
  }
}
