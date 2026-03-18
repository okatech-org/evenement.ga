import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import QRCode from "qrcode";

/**
 * GET /api/events/[id]/qr/public?token=xxx — Generate QR code for a guest via inviteToken (no auth)
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token requis" }, { status: 400 });
    }

    const guest = await prisma.guest.findUnique({
      where: { inviteToken: token },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        qrToken: true,
        eventId: true,
        status: true,
      },
    });

    if (!guest || guest.eventId !== params.id) {
      return NextResponse.json({ error: "Invité non trouvé" }, { status: 404 });
    }

    if (guest.status !== "CONFIRMED") {
      return NextResponse.json(
        { error: "RSVP non confirmé" },
        { status: 403 }
      );
    }

    if (!guest.qrToken) {
      return NextResponse.json(
        { error: "QR code non disponible" },
        { status: 404 }
      );
    }

    const qrDataUrl = await QRCode.toDataURL(guest.qrToken, {
      width: 400,
      margin: 2,
      color: { dark: "#1A202C", light: "#FFFFFF" },
      errorCorrectionLevel: "M",
    });

    return NextResponse.json({
      success: true,
      data: {
        guestId: guest.id,
        guestName: `${guest.firstName} ${guest.lastName}`,
        qrDataUrl,
      },
    });
  } catch (error) {
    console.error("Public QR error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
