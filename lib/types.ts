/**
 * Types d'énumération partagés — remplace les imports depuis `@prisma/client`.
 *
 * Historique : l'application migre de Prisma/PostgreSQL vers Convex. Ces types
 * sont déclarés ici comme string literal unions pour rester compatibles avec
 * l'ancien code qui importait `@prisma/client` tout en fonctionnant sans la
 * dépendance Prisma.
 *
 * Le schéma côté Convex (`convex/schema.ts`) stocke ces valeurs comme
 * `v.string()` — la validation des valeurs autorisées se fait côté TypeScript
 * via ces unions.
 */

// ─── Utilisateurs ─────────────────────────────────────
export type Role =
  | "ORGANIZER"
  | "CO_ORGANIZER"
  | "GUEST_PREVIEW"
  | "MODERATOR"
  | "ADMIN"
  | "SUPER_ADMIN";

export type Plan = "FREE" | "ESSENTIEL" | "PREMIUM" | "ENTREPRISE";

// ─── Événements ───────────────────────────────────────
export type EventType =
  | "MARIAGE"
  | "ANNIVERSAIRE"
  | "DEUIL"
  | "BAPTEME"
  | "CONFERENCE"
  | "PRIVE";

export type EventStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type Visibility = "PUBLIC" | "SEMI_PRIVATE" | "PRIVATE" | "PASSWORD";

// ─── Invités ──────────────────────────────────────────
export type GuestStatus =
  | "INVITED"
  | "SEEN"
  | "CONFIRMED"
  | "DECLINED"
  | "ABSENT";

// ─── Modules ──────────────────────────────────────────
export type ModuleType =
  | "MOD_INVITE"
  | "MOD_RSVP"
  | "MOD_MENU"
  | "MOD_QR"
  | "MOD_LOGISTIQUE"
  | "MOD_CHAT"
  | "MOD_PROGRAMME"
  | "MOD_GALERIE"
  | "MOD_DASHBOARD";

// ─── Scan QR ──────────────────────────────────────────
export type ScanStatus = "VALID" | "ALREADY_SCANNED" | "INVALID" | "EXPIRED";

// ─── Messages ─────────────────────────────────────────
export type MessageType = "TEXT" | "IMAGE" | "REACTION";

// ─── Système ──────────────────────────────────────────
export type LogLevel = "INFO" | "WARNING" | "ERROR" | "CRITICAL";
export type ControllerPermission = "VERIFY" | "SCAN";
export type ReportStatus = "PENDING" | "REVIEWING" | "RESOLVED" | "DISMISSED";

// ─── JSON ─────────────────────────────────────────────
// Remplace `Prisma.JsonValue` pour les champs JSON arbitraires.
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };
