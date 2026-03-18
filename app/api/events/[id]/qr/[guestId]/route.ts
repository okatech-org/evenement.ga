import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import QRCode from "qrcode";

/**
 * GET /api/events/[id]/qr/[guestId] — Generate QR code for a specific guest
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string; guestId: string } }
) {
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

    // Verify guest belongs to event
    const guest = await prisma.guest.findFirst({
      where: { id: params.guestId, eventId: params.id },
    });

    if (!guest) {
      return NextResponse.json({ error: "Invité non trouvé" }, { status: 404 });
    }

    // Generate QR code data (URL to scan endpoint)
    const baseUrl = process.env.NEXTAUTH_URL || "https://evenement.ga";
    const scanUrl = `${baseUrl}/scan/${event.slug}/${guest.id}`;

    // Generate QR as data URL
    const qrDataUrl = await QRCode.toDataURL(scanUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: "#1A202C",
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "M",
    });

    // Update guest QR token
    await prisma.guest.update({
      where: { id: guest.id },
      data: { qrToken: scanUrl },
    });

    return NextResponse.json({
      success: true,
      data: {
        guestId: guest.id,
        guestName: `${guest.firstName} ${guest.lastName}`,
        qrDataUrl,
        scanUrl,
      },
    });
  } catch (error) {
    console.error("QR generation error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
