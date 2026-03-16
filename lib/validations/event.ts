import { z } from "zod";

/**
 * Validation schema for creating an event
 */
export const CreateEventSchema = z.object({
  title: z
    .string()
    .min(3, "Le titre doit contenir au moins 3 caractères")
    .max(100, "Le titre ne peut pas dépasser 100 caractères"),
  type: z.enum([
    "MARIAGE",
    "ANNIVERSAIRE",
    "DEUIL",
    "BAPTEME",
    "CONFERENCE",
    "PRIVE",
  ]),
  date: z
    .string()
    .or(z.date())
    .transform((val) => new Date(val))
    .refine((date) => date > new Date(), "La date doit être dans le futur"),
  location: z.string().optional(),
  description: z.string().max(2000).optional(),
  slug: z
    .string()
    .min(4, "Le slug doit contenir au moins 4 caractères")
    .max(60, "Le slug ne peut pas dépasser 60 caractères")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Le slug ne peut contenir que des lettres, chiffres et tirets"
    ),
  guestCount: z.number().int().positive().optional(),
  themePreset: z
    .enum(["mariage", "anniversaire", "deuil", "bapteme", "conference", "prive"])
    .optional()
    .default("mariage"),
  visibility: z
    .enum(["PUBLIC", "SEMI_PRIVATE", "PRIVATE", "PASSWORD"])
    .optional()
    .default("SEMI_PRIVATE"),
  password: z.string().optional(),
  maxGuests: z.number().int().positive().optional(),
});

export type CreateEventInput = z.infer<typeof CreateEventSchema>;

/**
 * Validation schema for updating an event
 */
export const UpdateEventSchema = CreateEventSchema.partial().extend({
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});

export type UpdateEventInput = z.infer<typeof UpdateEventSchema>;
