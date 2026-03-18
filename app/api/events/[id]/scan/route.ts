import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * POST /api/events/[id]/scan — Scan QR code and record entry
 * Supports: guestId (legacy), qrToken (URL from QR), inviteToken (token from URL)
 * 
 * Returns guest info: name, counts, menu, allergies, group
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
    const { guestId, qrToken, inviteToken, scannedUrl } = body;

    // Verify ownership
    const event = await prisma.event.findUnique({
      where: { id: params.id, userId: session.user.id },
    });

    if (!event) {
      return NextResponse.json({ error: "Événement non trouvé" }, { status: 404 });
    }

    // ── Find guest by multiple lookup strategies ──
    let guest;

    if (guestId) {
      // Direct lookup by ID
      guest = await prisma.guest.findFirst({
        where: { id: guestId, eventId: params.id },
        include: { rsvp: true, qrScans: true },
      });
    } else if (inviteToken) {
      // Lookup by invite token
      guest = await prisma.guest.findFirst({
        where: { inviteToken, eventId: params.id },
        include: { rsvp: true, qrScans: true },
      });
    } else if (qrToken) {
      // Lookup by QR token (the full scan URL stored in DB)
      guest = await prisma.guest.findFirst({
        where: { qrToken, eventId: params.id },
        include: { rsvp: true, qrScans: true },
      });
    } else if (scannedUrl) {
      // Parse the scanned URL to extract the token
      // Format: https://domain/scan/{slug}/{token}
      const parts = scannedUrl.split("/");
      const token = parts[parts.length - 1];

      if (token) {
        // Try inviteToken first, then by qrToken containing the token
        guest = await prisma.guest.findFirst({
          where: {
            eventId: params.id,
            OR: [
              { inviteToken: token },
              { qrToken: { contains: token } },
              { id: token },
            ],
          },
          include: { rsvp: true, qrScans: true },
        });
      }
    }

    if (!guest) {
      return NextResponse.json({
        success: false,
        scan: {
          status: "INVALID",
          message: "❌ Invité non trouvé — QR code invalide",
          color: "red",
        },
      });
    }

    // Check status — declined
    if (guest.status === "DECLINED") {
      return NextResponse.json({
        success: true,
        scan: {
          status: "DECLINED",
          message: `${guest.firstName} ${guest.lastName} a décliné l'invitation`,
          color: "red",
          guest: {
            firstName: guest.firstName,
            lastName: guest.lastName,
            group: guest.group,
          },
        },
      });
    }

    // Check status — not confirmed
    if (guest.status !== "CONFIRMED") {
      return NextResponse.json({
        success: true,
        scan: {
          status: "NOT_CONFIRMED",
          message: `${guest.firstName} ${guest.lastName} — Invitation non confirmée`,
          color: "orange",
          guest: {
            firstName: guest.firstName,
            lastName: guest.lastName,
            group: guest.group,
            status: guest.status,
          },
        },
      });
    }

    // Check if already scanned today
    const existingScan = await prisma.qRScan.findFirst({
      where: { guestId: guest.id, eventId: params.id },
    });

    if (existingScan) {
      return NextResponse.json({
        success: true,
        scan: {
          status: "ALREADY_SCANNED",
          message: `⚠️ ${guest.firstName} ${guest.lastName} — Déjà scanné`,
          color: "orange",
          scannedAt: existingScan.scannedAt,
          guest: {
            firstName: guest.firstName,
            lastName: guest.lastName,
            group: guest.group,
            adultCount: guest.rsvp?.adultCount ?? 1,
            childrenCount: guest.rsvp?.childrenCount ?? 0,
            menuChoice: guest.rsvp?.menuChoice,
            allergies: guest.rsvp?.allergies || [],
          },
        },
      });
    }

    // ── Create scan record — VALID ──
    const scan = await prisma.qRScan.create({
      data: {
        guestId: guest.id,
        eventId: params.id,
        scannedBy: session.user.id,
        status: "VALID",
      },
    });

    return NextResponse.json({
      success: true,
      scan: {
        status: "VALID",
        message: `✅ Bienvenue ${guest.firstName} ${guest.lastName} !`,
        color: "green",
        scannedAt: scan.scannedAt,
        guest: {
          firstName: guest.firstName,
          lastName: guest.lastName,
          group: guest.group,
          adultCount: guest.rsvp?.adultCount ?? 1,
          childrenCount: guest.rsvp?.childrenCount ?? 0,
          menuChoice: guest.rsvp?.menuChoice,
          allergies: guest.rsvp?.allergies || [],
        },
      },
    });
  } catch (error) {
    console.error("Scan error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/events/[id]/scan — Get scan history
 */
export async function GET(
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
      select: { id: true },
    });

    if (!event) {
      return NextResponse.json({ error: "Événement non trouvé" }, { status: 404 });
    }

    const scans = await prisma.qRScan.findMany({
      where: { eventId: params.id },
      include: {
        guest: {
          select: {
            firstName: true,
            lastName: true,
            group: true,
            rsvp: { select: { adultCount: true, childrenCount: true, menuChoice: true } },
          },
        },
      },
      orderBy: { scannedAt: "desc" },
      take: 50,
    });

    const totalGuests = await prisma.guest.count({
      where: { eventId: params.id, status: "CONFIRMED" },
    });

    return NextResponse.json({
      success: true,
      data: {
        scans: scans.map((s) => ({
          id: s.id,
          guestName: `${s.guest.firstName} ${s.guest.lastName}`,
          group: s.guest.group,
          adultCount: s.guest.rsvp?.adultCount ?? 1,
          childrenCount: s.guest.rsvp?.childrenCount ?? 0,
          menuChoice: s.guest.rsvp?.menuChoice,
          scannedAt: s.scannedAt.toISOString(),
          status: s.status,
        })),
        stats: {
          scanned: scans.length,
          totalConfirmed: totalGuests,
          remaining: totalGuests - scans.length,
        },
      },
    });
  } catch (error) {
    console.error("Scan history error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
