export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { verifyCsrf } from "@/lib/api-guards";
import { z } from "zod";
import convexClient from "@/lib/convex-server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

// Un venue accepte date soit ISO string soit timestamp ms
const VenueInputSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().min(1).max(500),
  date: z.union([z.string(), z.number()]),
  startTime: z.string().max(10).optional().nullable(),
  endTime: z.string().max(10).optional().nullable(),
  order: z.number().int().min(0).optional(),
  description: z.string().max(1000).optional().nullable(),
});

const VenuesReplaceSchema = z.object({
  venues: z.array(VenueInputSchema),
});

/**
 * PUT /api/events/[id]/venues — Remplace l'ensemble des venues d'un event
 * (delete all + insert new list, atomique via Convex).
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const csrfError = verifyCsrf(request);
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { venues } = VenuesReplaceSchema.parse(body);

    const preparedVenues = venues
      .filter((v) => v.name && v.address)
      .map((v, i) => ({
        name: v.name,
        address: v.address,
        date: typeof v.date === "number" ? v.date : new Date(v.date).getTime(),
        startTime: v.startTime || undefined,
        endTime: v.endTime || undefined,
        order: v.order ?? i,
        description: v.description || undefined,
      }));

    const result = await convexClient.mutation(api.venues.replaceAll, {
      eventId: params.id as Id<"events">,
      email: session.user.email,
      venues: preparedVenues,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Replace venues error:", error);
    const message = error instanceof Error ? error.message : "Erreur interne";
    const status = message.includes("access denied") || message.includes("User not found")
      ? 403
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * GET /api/events/[id]/venues — Liste les venues d'un event (admin uniquement).
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Vérification ownership via getForAdmin
  const event = await convexClient.query(api.events.getForAdmin, {
    id: params.id as Id<"events">,
    email: session.user.email,
  });
  if (!event) {
    return NextResponse.json({ error: "Événement non trouvé" }, { status: 404 });
  }

  const venues = await convexClient.query(api.venues.listByEvent, {
    eventId: params.id as Id<"events">,
  });

  return NextResponse.json({ success: true, data: venues });
}
