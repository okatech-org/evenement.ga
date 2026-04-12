import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { verifyCsrf } from "@/lib/api-guards";

/**
 * PUT /api/events/[id]/modules — Update modules order and activation
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const csrfError = verifyCsrf(request);
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    // Verify ownership
    const event = await prisma.event.findUnique({
      where: { id: params.id, userId: session.user.id },
    });

    if (!event) {
      return NextResponse.json({ error: "Événement non trouvé" }, { status: 404 });
    }

    const body = await request.json();
    const { modules } = body as {
      modules: { id: string; type: string; active: boolean; order: number; configJson?: unknown }[];
    };

    // Update each module (with eventId check to prevent cross-event manipulation)
    await Promise.all(
      modules.map((m) =>
        prisma.eventModule.update({
          where: { id: m.id, eventId: event.id },
          data: {
            active: m.active,
            order: m.order,
            ...(m.configJson !== undefined ? { configJson: m.configJson as object } : {}),
          },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update modules error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
