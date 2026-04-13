export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * GET /api/verify/[token] — Get event info for a controller link (public, no auth)
 */
export async function GET(
  _request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const link = await prisma.controllerLink.findUnique({
      where: { token: params.token },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            type: true,
            date: true,
            status: true,
          },
        },
      },
    });

    if (!link) {
      return NextResponse.json({
        success: false,
        error: "Lien invalide ou introuvable",
      }, { status: 404 });
    }

    // Check if link is active
    if (!link.isActive) {
      return NextResponse.json({
        success: false,
        error: "Ce lien a été désactivé par l'organisateur",
      }, { status: 403 });
    }

    // Check expiration
    if (link.expiresAt && link.expiresAt < new Date()) {
      return NextResponse.json({
        success: false,
        error: "Ce lien a expiré",
      }, { status: 403 });
    }

    // Check event status
    if (link.event.status !== "PUBLISHED") {
      return NextResponse.json({
        success: false,
        error: "Cet événement n'est pas encore publié",
      }, { status: 403 });
    }

    // Get live stats
    const totalConfirmed = await prisma.guest.count({
      where: { eventId: link.event.id, status: "CONFIRMED" },
    });

    const totalScanned = await prisma.qRScan.count({
      where: { eventId: link.event.id },
    });

    const totalGuests = await prisma.guest.count({
      where: { eventId: link.event.id },
    });

    // Update lastUsedAt
    await prisma.controllerLink.update({
      where: { id: link.id },
      data: { lastUsedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      data: {
        event: {
          title: link.event.title,
          type: link.event.type,
          date: link.event.date.toISOString(),
        },
        controller: {
          label: link.label,
          permission: link.permission,
        },
        stats: {
          totalGuests,
          totalConfirmed,
          totalScanned,
          remaining: totalConfirmed - totalScanned,
        },
      },
    });
  } catch (error) {
    console.error("Verify GET error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * POST /api/verify/[token] — Verify or scan a guest via controller link (public, no auth)
 * Body: { query: string } — inviteToken, QR URL, or guest name search
 */
export async function POST(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const link = await prisma.controllerLink.findUnique({
      where: { token: params.token },
      include: {
        event: { select: { id: true, title: true, slug: true } },
      },
    });

    if (!link) {
      return NextResponse.json({
        success: false,
        error: "Lien invalide",
      }, { status: 404 });
    }

    if (!link.isActive) {
      return NextResponse.json({
        success: false,
        error: "Ce lien a été désactivé",
      }, { status: 403 });
    }

    if (link.expiresAt && link.expiresAt < new Date()) {
      return NextResponse.json({
        success: false,
        error: "Ce lien a expiré",
      }, { status: 403 });
    }

    // Rate limiting: 30 requetes par minute par IP
    const ip = getClientIp(request);
    const rl = await rateLimit(`verify:${ip}`, 30, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Trop de requêtes. Réessayez dans quelques instants." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { query, action } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
    }

    const eventId = link.event.id;
    const trimmedQuery = query.trim();

    // ── Find guest by multiple strategies ──
    let guest = null;

    // 1. Try by inviteToken
    guest = await prisma.guest.findFirst({
      where: { eventId, inviteToken: trimmedQuery },
      include: { rsvp: true, qrScans: true },
    });

    // 2. Try by parsing scanned URL (format: .../slug?guest=TOKEN or .../scan/slug/TOKEN)
    if (!guest) {
      let extractedToken = null;

      // Parse URL format: ?guest=TOKEN
      try {
        const url = new URL(trimmedQuery);
        extractedToken = url.searchParams.get("guest");
      } catch {
        // Not a URL, try extracting from path
        const parts = trimmedQuery.split("/");
        extractedToken = parts[parts.length - 1];
      }

      if (extractedToken) {
        guest = await prisma.guest.findFirst({
          where: {
            eventId,
            OR: [
              { inviteToken: extractedToken },
              { qrToken: { contains: extractedToken } },
              { id: extractedToken },
            ],
          },
          include: { rsvp: true, qrScans: true },
        });
      }
    }

    // 3. Try by name search (last resort) — requete DB au lieu de charger tous les invites
    if (!guest) {
      const words = trimmedQuery.toLowerCase().split(/\s+/).filter(Boolean);
      if (words.length >= 1) {
        // Construire les conditions AND pour chaque mot
        const nameConditions = words.map((word) => ({
          OR: [
            { firstName: { contains: word, mode: "insensitive" as const } },
            { lastName: { contains: word, mode: "insensitive" as const } },
          ],
        }));

        guest = await prisma.guest.findFirst({
          where: {
            eventId,
            AND: nameConditions,
          },
          include: { rsvp: true, qrScans: true },
        });
      }
    }

    if (!guest) {
      return NextResponse.json({
        success: true,
        result: {
          status: "INVALID",
          message: "❌ Invité non trouvé",
          color: "red",
        },
      });
    }

    // ── Check guest status ──
    if (guest.status === "DECLINED") {
      return NextResponse.json({
        success: true,
        result: {
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

    if (guest.status !== "CONFIRMED") {
      return NextResponse.json({
        success: true,
        result: {
          status: "NOT_CONFIRMED",
          message: `${guest.firstName} ${guest.lastName} — Pas encore confirmé`,
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

    // Check if already scanned
    const existingScan = guest.qrScans.length > 0 ? guest.qrScans[0] : null;

    if (existingScan) {
      return NextResponse.json({
        success: true,
        result: {
          status: "ALREADY_SCANNED",
          message: `⚠️ ${guest.firstName} ${guest.lastName} — Déjà enregistré`,
          color: "orange",
          scannedAt: existingScan.scannedAt.toISOString(),
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

    // ── SCAN permission: record the entry ──
    if (link.permission === "SCAN" && action === "scan") {
      await prisma.qRScan.create({
        data: {
          guestId: guest.id,
          eventId,
          controllerLinkId: link.id,
          status: "VALID",
        },
      });

      // Update lastUsedAt
      await prisma.controllerLink.update({
        where: { id: link.id },
        data: { lastUsedAt: new Date() },
      });

      return NextResponse.json({
        success: true,
        result: {
          status: "VALID",
          message: `✅ Bienvenue ${guest.firstName} ${guest.lastName} !`,
          color: "green",
          recorded: true,
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

    // ── VERIFY permission: read-only ──
    return NextResponse.json({
      success: true,
      result: {
        status: "VALID",
        message: `✅ ${guest.firstName} ${guest.lastName} — Invitation valide`,
        color: "green",
        recorded: false,
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
    console.error("Verify POST error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
