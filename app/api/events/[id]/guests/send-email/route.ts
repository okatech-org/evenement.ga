import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  sendInvitationEmail,
  checkEmailRateLimit,
  recordEmailSent,
  isValidEmail,
} from "@/lib/email";

/**
 * POST /api/events/[id]/guests/send-email — Send invitation email to a guest via Resend
 * 
 * Security:
 * - Authenticated users only
 * - Owner-only access (event must belong to the user)
 * - Guest must belong to the event
 * - Rate limited: 5 emails per minute per user
 * - Input validation: email format, inviteToken presence
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  // ─── Auth ─────────────────────────────────────────
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // ─── Rate Limiting ────────────────────────────────
  if (!checkEmailRateLimit(session.user.id)) {
    return NextResponse.json(
      { error: "Trop d'emails envoyés. Veuillez patienter 1 minute." },
      { status: 429 }
    );
  }

  try {
    // ─── Event ownership check ──────────────────────
    const event = await prisma.event.findUnique({
      where: { id: params.id, userId: session.user.id },
      select: { id: true, slug: true, title: true },
    });

    if (!event) {
      return NextResponse.json({ error: "Événement non trouvé" }, { status: 404 });
    }

    // ─── Parse & validate body ──────────────────────
    let body: { guestId?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
    }

    const { guestId } = body;

    if (!guestId || typeof guestId !== "string") {
      return NextResponse.json({ error: "guestId requis (string)" }, { status: 400 });
    }

    // ─── Guest ownership check ──────────────────────
    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
    });

    if (!guest || guest.eventId !== event.id) {
      return NextResponse.json({ error: "Invité non trouvé" }, { status: 404 });
    }

    if (!guest.email) {
      return NextResponse.json(
        { error: "Cet invité n'a pas d'adresse email" },
        { status: 400 }
      );
    }

    if (!isValidEmail(guest.email)) {
      return NextResponse.json(
        { error: "L'adresse email de cet invité est invalide" },
        { status: 400 }
      );
    }

    if (!guest.inviteToken) {
      return NextResponse.json(
        { error: "Cet invité n'a pas encore de lien d'invitation. Générez-en un d'abord." },
        { status: 400 }
      );
    }

    // ─── Build invite URL ───────────────────────────
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://evenement.ga";
    const inviteUrl = `${baseUrl}/${event.slug}?guest=${guest.inviteToken}`;

    // ─── Fetch organizer name ───────────────────────
    const organizer = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true },
    });

    // ─── Send email ─────────────────────────────────
    const result = await sendInvitationEmail({
      to: guest.email,
      guestName: `${guest.firstName} ${guest.lastName}`,
      eventTitle: event.title,
      inviteUrl,
      hostName: organizer?.name || undefined,
    });

    // Record rate limit
    recordEmailSent(session.user.id);

    // ─── Log notification ───────────────────────────
    await prisma.notification.create({
      data: {
        userId: session.user.id,
        type: "EMAIL_SENT",
        content: JSON.stringify({
          guestId: guest.id,
          guestName: `${guest.firstName} ${guest.lastName}`,
          email: guest.email,
          eventTitle: event.title,
          resendId: result?.id,
          sentAt: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        emailId: result?.id,
        to: guest.email,
        message: `Email envoyé à ${guest.email}`,
      },
    });
  } catch (error: unknown) {
    console.error("Send email error:", error);
    const message = error instanceof Error ? error.message : "Erreur lors de l'envoi de l'email";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
