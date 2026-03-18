import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";

/**
 * POST /api/events/[id]/duplicate — Duplicate an event
 */
export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id: params.id, userId: session.user.id },
      include: {
        theme: true,
        modules: true,
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Événement non trouvé" }, { status: 404 });
    }

    // Generate unique slug for copy
    let slug = slugify(`${event.title} copie`);
    const existingSlug = await prisma.event.findUnique({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    // Create duplicated event
    const duplicated = await prisma.event.create({
      data: {
        title: `${event.title} (copie)`,
        slug,
        type: event.type,
        date: event.date,
        endDate: event.endDate,
        location: event.location,
        description: event.description,
        status: "DRAFT",
        visibility: event.visibility,
        coverImage: event.coverImage,
        coverVideo: event.coverVideo,
        userId: session.user.id,
        theme: event.theme
          ? {
              create: {
                preset: event.theme.preset,
                entryEffect: event.theme.entryEffect,
                ambientEffect: event.theme.ambientEffect,
                ambientIntensity: event.theme.ambientIntensity,
                scrollReveal: event.theme.scrollReveal,
                cursorEffect: event.theme.cursorEffect,
                colorPrimary: event.theme.colorPrimary,
                colorSecondary: event.theme.colorSecondary,
                colorAccent: event.theme.colorAccent,
                colorBackground: event.theme.colorBackground,
                colorText: event.theme.colorText,
                colorSurface: event.theme.colorSurface,
                colorMuted: event.theme.colorMuted,
                colorBorder: event.theme.colorBorder,
                fontDisplay: event.theme.fontDisplay,
                fontBody: event.theme.fontBody,
              },
            }
          : undefined,
        modules: {
          create: event.modules.map((m) => ({
            type: m.type,
            order: m.order,
            active: m.active,
            configJson: m.configJson as object,
          })),
        },
      },
      include: {
        theme: true,
        modules: true,
      },
    });

    return NextResponse.json(
      { success: true, data: duplicated },
      { status: 201 }
    );
  } catch (error) {
    console.error("Duplicate event error:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
