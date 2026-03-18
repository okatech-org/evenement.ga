import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { EventStatus } from "@prisma/client";

/**
 * POST /api/events/[id]/status — Update event status
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { status } = body as { status: EventStatus };

    if (!["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status)) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }

    const event = await prisma.event.update({
      where: { id: params.id, userId: session.user.id },
      data: { status },
    });

    return NextResponse.json({ success: true, data: event });
  } catch (error) {
    console.error("Update status error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
