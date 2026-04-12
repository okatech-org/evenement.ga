import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { sendRSVPConfirmationEmail } from "@/lib/email";
import { formatDate } from "@/lib/utils";
import QRCode from "qrcode";

/**
 * POST /api/events/[id]/rsvp — Submit RSVP (public, no auth required)
 * Supports:
 *   - guestToken → lookup pre-registered guest by inviteToken
 *   - No guestToken → create new guest (public self-registration)
 * On confirmation → auto-posts chat message + returns QR code
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Rate limiting: 10 RSVP par IP par heure
  const ip = getClientIp(request);
  const rl = await rateLimit(`rsvp:${ip}`, 10, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Trop de soumissions. Réessayez plus tard." },
      { status: 429 }
    );
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id: params.id },
      select: { id: true, slug: true, status: true, userId: true },
    });

    if (!event || event.status === "ARCHIVED") {
      return NextResponse.json(
        { error: "Événement non trouvé ou archivé" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      guestToken,
      firstName,
      lastName,
      email,
      presence,
      adultCount = 1,
      childrenCount = 0,
      menuChoice = null,
      allergies = [],
      message = null,
    } = body;

    let guest;

    if (guestToken) {
      // ── Lookup pre-registered guest by inviteToken ──
      guest = await prisma.guest.findUnique({
        where: { inviteToken: guestToken },
      });

      if (!guest || guest.eventId !== params.id) {
        return NextResponse.json(
          { error: "Invitation non trouvée" },
          { status: 404 }
        );
      }

      // Update guest status
      guest = await prisma.guest.update({
        where: { id: guest.id },
        data: {
          status: presence ? "CONFIRMED" : "DECLINED",
          // Update names if provided (allow guest to correct)
          ...(firstName ? { firstName } : {}),
          ...(lastName ? { lastName } : {}),
          ...(email ? { email } : {}),
        },
      });
    } else {
      // ── Public self-registration (no token) ──
      if (!firstName || !lastName || !email) {
        return NextResponse.json(
          { error: "Prénom, nom et email requis" },
          { status: 400 }
        );
      }

      guest = await prisma.guest.upsert({
        where: {
          id: `public-${email}-${params.id}`,
        },
        update: {
          firstName,
          lastName,
          status: presence ? "CONFIRMED" : "DECLINED",
        },
        create: {
          id: `public-${email}-${params.id}`,
          eventId: params.id,
          firstName,
          lastName,
          email,
          status: presence ? "CONFIRMED" : "DECLINED",
        },
      });
    }

    // ── Upsert RSVP ──
    await prisma.rSVP.upsert({
      where: { guestId: guest.id },
      update: {
        presence,
        adultCount: presence ? adultCount : 1,
        childrenCount: presence ? childrenCount : 0,
        menuChoice: presence ? menuChoice : null,
        allergies: presence ? allergies : [],
        message,
      },
      create: {
        guestId: guest.id,
        presence,
        adultCount: presence ? adultCount : 1,
        childrenCount: presence ? childrenCount : 0,
        menuChoice: presence ? menuChoice : null,
        allergies: presence ? allergies : [],
        message,
      },
    });

    // ── Auto-post chat message on confirmation ──
    if (presence) {
      try {
        await prisma.chatMessage.create({
          data: {
            eventId: params.id,
            userId: event.userId,
            content: `${guest.firstName} ${guest.lastName} a confirmé sa présence ! 🎉`,
            channel: "public",
          },
        });
      } catch {
        // Non-blocking: chat message failure shouldn't break RSVP
        console.error("Failed to post auto-chat message");
      }
    }

    // ── Generate QR code if confirmed ──
    let qrDataUrl: string | null = null;
    if (presence && guest.qrToken) {
      try {
        qrDataUrl = await QRCode.toDataURL(guest.qrToken, {
          width: 400,
          margin: 2,
          color: { dark: "#1A202C", light: "#FFFFFF" },
          errorCorrectionLevel: "M",
        });
      } catch {
        console.error("QR generation failed");
      }
    } else if (presence && !guest.qrToken) {
      // Generate QR for self-registered guests too
      const baseUrl = process.env.NEXTAUTH_URL || "https://evenement.ga";
      const scanUrl = `${baseUrl}/scan/${event.slug}/${guest.id}`;
      try {
        qrDataUrl = await QRCode.toDataURL(scanUrl, {
          width: 400,
          margin: 2,
          color: { dark: "#1A202C", light: "#FFFFFF" },
          errorCorrectionLevel: "M",
        });
        await prisma.guest.update({
          where: { id: guest.id },
          data: { qrToken: scanUrl },
        });
      } catch {
        console.error("QR generation failed");
      }
    }

    // ── Envoyer email de confirmation RSVP ──
    if (presence && guest.email) {
      const baseUrl = process.env.NEXTAUTH_URL || "https://evenement.ga";
      const fullEvent = await prisma.event.findUnique({
        where: { id: event.id },
        select: { title: true, date: true, location: true, slug: true },
      });
      if (fullEvent) {
        try {
          await sendRSVPConfirmationEmail({
            to: guest.email,
            guestName: `${guest.firstName} ${guest.lastName ?? ""}`.trim(),
            eventTitle: fullEvent.title,
            eventDate: formatDate(fullEvent.date),
            eventLocation: fullEvent.location ?? undefined,
            qrDataUrl: qrDataUrl ?? undefined,
            eventUrl: `${baseUrl}/${fullEvent.slug}`,
          });
        } catch {
          // Non-bloquant: l'echec email ne casse pas le RSVP
          console.error("Failed to send RSVP confirmation email");
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        guestId: guest.id,
        firstName: guest.firstName,
        lastName: guest.lastName,
        presence,
        qrDataUrl,
      },
    });
  } catch (error) {
    console.error("RSVP error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
