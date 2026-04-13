export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { verifyCsrf } from "@/lib/api-guards";
import { randomBytes } from "crypto";

/**
 * POST /api/events/[id]/guests/generate-token — Generate inviteToken for an existing guest
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
    const event = await prisma.event.findUnique({
      where: { id: params.id, userId: session.user.id },
      select: { id: true, slug: true },
    });

    if (!event) {
      return NextResponse.json({ error: "Événement non trouvé" }, { status: 404 });
    }

    const body = await request.json();
    const { guestId } = body;

    if (!guestId) {
      return NextResponse.json({ error: "guestId requis" }, { status: 400 });
    }

    // Check that this guest belongs to this event
    const existingGuest = await prisma.guest.findUnique({
      where: { id: guestId },
    });

    if (!existingGuest || existingGuest.eventId !== event.id) {
      return NextResponse.json({ error: "Invité non trouvé" }, { status: 404 });
    }

    // Generate unique tokens
    const inviteToken = randomBytes(12).toString("hex");
    const baseUrl = process.env.NEXTAUTH_URL || "https://evenement.ga";
    const scanUrl = `${baseUrl}/scan/${event.slug}/${inviteToken}`;

    // Update the guest
    const guest = await prisma.guest.update({
      where: { id: guestId },
      data: {
        inviteToken,
        qrToken: existingGuest.qrToken || scanUrl,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: guest.id,
        inviteToken: guest.inviteToken,
        inviteUrl: `${baseUrl}/${event.slug}?guest=${inviteToken}`,
      },
    });
  } catch (error) {
    console.error("Generate token error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
