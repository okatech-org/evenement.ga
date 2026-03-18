import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { getDefaultModulesForType, getDefaultPresetForType } from "@/lib/modules/defaults";
import type { EventType } from "@prisma/client";

/**
 * GET /api/events — List events for the authenticated user
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const events = await prisma.event.findMany({
    where: { userId: session.user.id },
    include: {
      theme: true,
      _count: { select: { guests: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: events });
}

/**
 * POST /api/events — Create a new event
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, eventType, date, dates, location, venues } = body;

    if (!title || !eventType) {
      return NextResponse.json(
        { error: "Titre et type requis" },
        { status: 400 }
      );
    }

    // Support both single date and dates array
    const eventDates: string[] = dates && dates.length > 0
      ? dates
      : date
      ? [date]
      : [];

    if (eventDates.length === 0) {
      return NextResponse.json(
        { error: "Au moins une date requise" },
        { status: 400 }
      );
    }

    // Generate unique slug
    let slug = slugify(title);
    const existingSlug = await prisma.event.findUnique({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    // Use first date as the primary event date
    const primaryDate = new Date(eventDates[0]);

    // Create event with theme and default modules
    const event = await prisma.event.create({
      data: {
        title,
        slug,
        type: eventType as EventType,
        date: primaryDate,
        endDate: eventDates.length > 1 ? new Date(eventDates[eventDates.length - 1]) : null,
        location: location || (venues && venues.length > 0 ? venues[0].name : null),
        status: "DRAFT",
        visibility: "SEMI_PRIVATE",
        userId: session.user.id,
        theme: {
          create: {
            preset: getDefaultPresetForType(eventType as EventType),
          },
        },
        modules: {
          create: getDefaultModulesForType(eventType as EventType).map((m) => ({
            type: m.type,
            order: m.order,
            active: m.active,
            configJson: {},
          })),
        },
      },
      include: {
        theme: true,
        modules: true,
      },
    });

    return NextResponse.json(
      { success: true, data: event },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create event error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

