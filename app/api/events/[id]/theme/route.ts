import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/events/[id]/theme — Get theme data
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
 * PUT /api/events/[id]/theme — Update theme
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

    const theme = await prisma.eventTheme.upsert({
      where: { eventId: event.id },
      update: { ...body },
      create: { eventId: event.id, ...body },
    });

    return NextResponse.json({ success: true, data: theme });
  } catch (error) {
    console.error("Update theme error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
