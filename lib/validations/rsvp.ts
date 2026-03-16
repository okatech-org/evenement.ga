import { z } from "zod";

/**
 * Validation schema for RSVP submission
 */
export const RSVPSchema = z.object({
  guestId: z.string().optional(),
  eventId: z.string(),
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
  email: z.string().email("Email invalide").optional(),
  presence: z.boolean(),
  adultCount: z.number().int().min(1).default(1),
  childrenCount: z.number().int().min(0).default(0),
  menuChoice: z.string().optional(),
  allergies: z.array(z.string()).optional().default([]),
  message: z.string().max(1000).optional(),
});

export type RSVPInput = z.infer<typeof RSVPSchema>;
