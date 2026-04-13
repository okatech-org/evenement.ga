export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { verifyCsrf } from "@/lib/api-guards";
import type { EventStatus } from "@prisma/client";
import { logSystem } from "@/lib/superadmin/logger";

/**
 * POST /api/events/[id]/status — Update event status
 */
export async function POST(
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
    const body = await request.json();
    const { status } = body as { status: EventStatus };

    if (!["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status)) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }

    const event = await prisma.event.update({
      where: { id: params.id, userId: session.user.id },
      data: { status },
    });

    logSystem("INFO", "EVENT", "STATUS_CHANGED", { actorId: session.user.id, targetId: params.id, metadata: { status } });

    return NextResponse.json({ success: true, data: event });
  } catch (error) {
    console.error("Update status error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
