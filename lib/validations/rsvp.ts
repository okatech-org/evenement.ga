import { z } from "zod";

/**
 * Validation schema for RSVP submission
 */
export const RSVPSchema = z.object({
  guestId: z.string().optional(),
  eventId: z.string(),
  firstName: z.string().min(1, "Le prénom est requis").max(100),
  lastName: z.string().min(1, "Le nom est requis").max(100),
  email: z.string().email("Email invalide").max(254).optional().or(z.literal("")),
  presence: z.boolean(),
  adultCount: z.number().int().min(1, "Au moins 1 adulte").max(20, "Maximum 20 adultes").default(1),
  childrenCount: z.number().int().min(0, "Nombre invalide").max(20, "Maximum 20 enfants").default(0),
  menuChoice: z.string().max(100).optional(),
  allergies: z.array(z.string().max(100)).max(20).optional().default([]),
  message: z.string().max(500, "Message trop long (500 caractères max)").optional(),
});

export type RSVPInput = z.infer<typeof RSVPSchema>;
