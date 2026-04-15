export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import convexClient from "@/lib/convex-server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

// Whitelist des champs autorisés pour le theme
const ThemeUpdateSchema = z.object({
  preset: z.string().optional(),
  entryEffect: z.string().optional(),
  ambientEffect: z.string().nullable().optional(),
  ambientIntensity: z.number().min(0).max(1).optional(),
  scrollReveal: z.string().optional(),
  cursorEffect: z.string().nullable().optional(),
  soundEnabled: z.boolean().optional(),
  soundUrl: z.string().nullable().optional(),
  colorPrimary: z.string().optional(),
  colorSecondary: z.string().optional(),
  colorAccent: z.string().optional(),
  colorBackground: z.string().optional(),
  colorText: z.string().optional(),
  colorSurface: z.string().optional(),
  colorMuted: z.string().optional(),
  colorBorder: z.string().optional(),
  fontDisplay: z.string().optional(),
  fontBody: z.string().optional(),
  fontSizeTitle: z.string().optional(),
  fontSizeBody: z.string().optional(),
  letterSpacing: z.string().optional(),
  lineHeight: z.string().optional(),
  pageMedia: z.any().optional(),
  pageThemes: z.any().optional(),
});

/**
 * GET /api/events/[id]/theme — Récupérer le theme (migré Convex)
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const event = await convexClient.query(api.events.getForAdmin, {
    id: params.id as Id<"events">,
    email: session.user.email,
  });

  if (!event) {
    return NextResponse.json({ error: "Événement non trouvé" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: event.theme });
}

/**
 * PUT /api/events/[id]/theme — Mettre à jour le theme (migré Convex)
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validatedData = ThemeUpdateSchema.parse(body);

    // pageMedia/pageThemes sont des objets → stringify pour Convex (stocké en v.string())
    const payload: Record<string, unknown> = {
      eventId: params.id as Id<"events">,
      email: session.user.email,
    };
    for (const [key, value] of Object.entries(validatedData)) {
      if (value === undefined) continue;
      if (key === "pageMedia" || key === "pageThemes") {
        payload[key] = typeof value === "string" ? value : JSON.stringify(value);
      } else {
        payload[key] = value;
      }
    }

    await convexClient.mutation(
      api.themes.patchByEvent,
      payload as Parameters<typeof convexClient.mutation<typeof api.themes.patchByEvent>>[1]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données de thème invalides", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Update theme error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
