import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { verifyCsrf } from "@/lib/api-guards";
import {
  sendEventNotificationEmail,
  checkEmailRateLimit,
  recordEmailSent,
} from "@/lib/email";
import { logSystem } from "@/lib/superadmin/logger";

/**
 * POST /api/events/[id]/notify — Envoyer un email de notification aux invites
 * Body: { subject, message, guestIds? (optionnel, sinon tous les invites avec email) }
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

  // Rate limiting par utilisateur
  if (!checkEmailRateLimit(session.user.id)) {
    return NextResponse.json(
      { error: "Trop d'emails envoyés. Attendez une minute." },
      { status: 429 }
    );
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id: params.id, userId: session.user.id },
      include: {
        guests: {
          where: { email: { not: null } },
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Événement non trouvé" }, { status: 404 });
    }

    const body = await request.json();
    const { subject, message, guestIds } = body;

    if (!subject || !message) {
      return NextResponse.json(
        { error: "Sujet et message requis" },
        { status: 400 }
      );
    }

    // Filtrer les destinataires si des IDs specifiques sont fournis
    const recipients = guestIds
      ? event.guests.filter((g) => guestIds.includes(g.id))
      : event.guests;

    const recipientEmails = recipients
      .filter((g) => g.email)
      .map((g) => ({
        email: g.email!,
        name: `${g.firstName} ${g.lastName}`,
      }));

    if (recipientEmails.length === 0) {
      return NextResponse.json(
        { error: "Aucun destinataire avec une adresse email" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXTAUTH_URL || "https://evenement.ga";
    const eventUrl = `${baseUrl}/${event.slug}`;

    // Envoyer les emails via Resend avec un delai entre chaque
    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of recipientEmails) {
      try {
        await sendEventNotificationEmail({
          to: recipient.email,
          guestName: recipient.name,
          eventTitle: event.title,
          subject,
          message,
          eventUrl,
        });
        sentCount++;
        recordEmailSent(session.user.id);

        // Delai de 200ms entre chaque email pour respecter les limites API
        if (sentCount < recipientEmails.length) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      } catch (error) {
        console.error(`Failed to send to ${recipient.email}:`, error);
        failedCount++;
      }
    }

    // Enregistrer la notification en base
    await prisma.notification.create({
      data: {
        userId: session.user.id,
        type: "EMAIL_SENT",
        content: JSON.stringify({
          subject,
          sentCount,
          failedCount,
          totalRecipients: recipientEmails.length,
          eventTitle: event.title,
        }),
      },
    });

    logSystem("INFO", "EVENT", "NOTIFICATION_SENT", { actorId: session.user.id, targetId: params.id, metadata: { sentCount, failedCount, totalRecipients: recipientEmails.length } });

    return NextResponse.json({
      success: true,
      data: {
        sentCount,
        failedCount,
        totalRecipients: recipientEmails.length,
      },
    });
  } catch (error) {
    console.error("Notify error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
