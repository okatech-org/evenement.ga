import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * POST /api/events/[id]/notify — Send notification/email to guests
 * This is a placeholder for Resend integration
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

    // Filter guests if specific IDs provided
    const recipients = guestIds
      ? event.guests.filter((g) => guestIds.includes(g.id))
      : event.guests;

    const recipientEmails = recipients
      .filter((g) => g.email)
      .map((g) => ({
        email: g.email!,
        name: `${g.firstName} ${g.lastName}`,
      }));

    // Create notifications in DB
    await prisma.notification.create({
      data: {
        userId: session.user.id,
        type: "EMAIL_SENT",
        content: JSON.stringify({
          subject,
          recipientCount: recipientEmails.length,
          eventTitle: event.title,
        }),
      },
    });

    // TODO: Integrate Resend for actual email sending
    // import { Resend } from "resend";
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // for (const r of recipientEmails) {
    //   await resend.emails.send({
    //     from: "EventFlow <noreply@evenement.ga>",
    //     to: r.email,
    //     subject: subject,
    //     html: `<p>Bonjour ${r.name},</p><p>${message}</p>`,
    //   });
    // }

    return NextResponse.json({
      success: true,
      data: {
        recipientCount: recipientEmails.length,
        message: "Notifications enregistrées (envoi email à configurer)",
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
