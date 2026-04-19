/**
 * Re-export de tous les schemas de validation
 * et schemas additionnels pour les routes API
 */

export { CreateEventSchema, UpdateEventSchema } from "./event";
export type { CreateEventInput, UpdateEventInput } from "./event";
export { RSVPSchema } from "./rsvp";
export type { RSVPInput } from "./rsvp";

import { z } from "zod";

// ─── Guest validation ──────────────────────────────

export const AddGuestSchema = z.object({
  firstName: z.string().min(1, "Le prénom est requis").max(100),
  lastName: z.string().min(1, "Le nom est requis").max(100),
  email: z.string().email("Email invalide").max(254).optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  group: z.string().max(100).optional().or(z.literal("")),
});

export type AddGuestInput = z.infer<typeof AddGuestSchema>;

// ─── Chat validation ───────────────────────────────

export const ChatMessageSchema = z.object({
  senderName: z.string().min(1, "Nom requis").max(100),
  text: z.string().min(1, "Message requis").max(500, "Message trop long (500 caractères max)"),
  replyToId: z.string().optional(),
});

export type ChatMessageInput = z.infer<typeof ChatMessageSchema>;

// ─── Event status validation ───────────────────────

export const EventStatusSchema = z.object({
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
});

// ─── Module batch update validation ────────────────

export const ModuleUpdateSchema = z.object({
  modules: z.array(
    z.object({
      id: z.string().optional(),
      type: z.enum([
        "MOD_INVITE", "MOD_RSVP", "MOD_MENU", "MOD_QR",
        "MOD_LOGISTIQUE", "MOD_CHAT", "MOD_PROGRAMME",
        "MOD_GALERIE", "MOD_DASHBOARD",
      ]),
      active: z.boolean(),
      order: z.number().int().min(0),
      configJson: z.record(z.string(), z.unknown()).optional(),
    })
  ),
});

export type ModuleUpdateInput = z.infer<typeof ModuleUpdateSchema>;

// ─── Event update validation ───────────────────────

export const EventUpdateSchema = z
  .object({
    title: z.string().min(3).max(100).optional(),
    description: z.string().max(5000).optional().nullable(),
    // Legacy scalaire — conservé pour rétro-compat, utilisé si dates absent
    date: z.string().optional(),
    // Multi-jour : liste complète des dates (ISO strings ou timestamps ms)
    dates: z.array(z.union([z.string(), z.number()])).min(1).optional(),
    location: z.string().max(500).optional().nullable(),
    visibility: z.enum(["PUBLIC", "SEMI_PRIVATE", "PRIVATE", "PASSWORD"]).optional(),
    password: z.string().max(100).optional().nullable(),
    coverImage: z.string().optional().nullable(),
    coverVideo: z.string().optional().nullable(),
    maxGuests: z.number().int().positive().optional().nullable(),
    rsvpDeadline: z.number().int().nullable().optional(),
  })
  // Si visibility = PASSWORD, un mot de passe non vide est requis (évite une config
  // trompeuse où l'event semble protégé mais ne l'est pas).
  .refine(
    (data) => {
      if (data.visibility !== "PASSWORD") return true;
      return typeof data.password === "string" && data.password.trim().length >= 4;
    },
    {
      message: "Un mot de passe d'au moins 4 caractères est requis pour la visibilité 'Mot de passe'",
      path: ["password"],
    }
  );

export type EventUpdateInput = z.infer<typeof EventUpdateSchema>;
