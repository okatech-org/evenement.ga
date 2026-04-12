import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

// Whitelist des champs autorises pour le theme
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
 * GET /api/events/[id]/theme — Recuperer le theme
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const event = await prisma.event.findUnique({
    where: { id: params.id, userId: session.user.id },
    include: { theme: true },
  });

  if (!event) {
    return NextResponse.json({ error: "Événement non trouvé" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: event.theme });
}

/**
 * PUT /api/events/[id]/theme — Mettre a jour le theme
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id: params.id, userId: session.user.id },
    });

    if (!event) {
      return NextResponse.json({ error: "Événement non trouvé" }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = ThemeUpdateSchema.parse(body);

    const theme = await prisma.eventTheme.upsert({
      where: { eventId: event.id },
      update: validatedData,
      create: { eventId: event.id, ...validatedData },
    });

    return NextResponse.json({ success: true, data: theme });
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
