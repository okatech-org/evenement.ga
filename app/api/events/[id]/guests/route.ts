import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkGuestLimit } from "@/lib/plan-guard";
import { AddGuestSchema } from "@/lib/validations";
import { z } from "zod";
import { randomBytes } from "crypto";
import QRCode from "qrcode";
import type { Plan } from "@prisma/client";

/**
 * GET /api/events/[id]/guests — List all guests
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
      select: { id: true, slug: true },
    });

    if (!event) {
      return NextResponse.json({ error: "Événement non trouvé" }, { status: 404 });
    }

    const guests = await prisma.guest.findMany({
      where: { eventId: event.id },
      include: { rsvp: true },
      orderBy: { createdAt: "desc" },
    });

    const baseUrl = process.env.NEXTAUTH_URL || "https://evenement.ga";

    return NextResponse.json({
      success: true,
      data: guests.map((g) => ({
        id: g.id,
        firstName: g.firstName,
        lastName: g.lastName,
        email: g.email,
        phone: g.phone,
        group: g.group,
        status: g.status,
        inviteToken: g.inviteToken,
        inviteUrl: g.inviteToken
          ? `${baseUrl}/${event.slug}?guest=${g.inviteToken}`
          : null,
        hasRsvp: !!g.rsvp,
        presence: g.rsvp?.presence ?? null,
        createdAt: g.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Guest list error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * POST /api/events/[id]/guests — Add a new guest
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
      select: { id: true, slug: true },
    });

    if (!event) {
      return NextResponse.json({ error: "Événement non trouvé" }, { status: 404 });
    }

    const body = await request.json();
    const validatedGuest = AddGuestSchema.parse(body);
    const { firstName, lastName } = validatedGuest;
    const email = validatedGuest.email || null;
    const phone = validatedGuest.phone || null;
    const group = validatedGuest.group || null;

    // Verifier la limite d'invites du plan
    const guestCheck = await checkGuestLimit(
      event.id,
      (session.user.plan ?? "FREE") as Plan
    );
    if (!guestCheck.allowed) {
      return NextResponse.json(
        { error: guestCheck.reason, requiredPlan: guestCheck.requiredPlan },
        { status: 403 }
      );
    }

    // Generate unique tokens
    const inviteToken = randomBytes(12).toString("hex");
    const baseUrl = process.env.NEXTAUTH_URL || "https://evenement.ga";
    const scanUrl = `${baseUrl}/scan/${event.slug}/${inviteToken}`;

    // Generate QR code
    const qrDataUrl = await QRCode.toDataURL(scanUrl, {
      width: 400,
      margin: 2,
      color: { dark: "#1A202C", light: "#FFFFFF" },
      errorCorrectionLevel: "M",
    });

    const guest = await prisma.guest.create({
      data: {
        eventId: event.id,
        firstName,
        lastName,
        email: email || null,
        phone: phone || null,
        group: group || null,
        inviteToken,
        qrToken: scanUrl,
        status: "INVITED",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: guest.id,
        firstName: guest.firstName,
        lastName: guest.lastName,
        email: guest.email,
        phone: guest.phone,
        group: guest.group,
        inviteToken: guest.inviteToken,
        inviteUrl: `${baseUrl}/${event.slug}?guest=${inviteToken}`,
        qrDataUrl,
        status: guest.status,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Guest create error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * DELETE /api/events/[id]/guests — Delete a guest (body: { guestId })
 */
export async function DELETE(
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
      select: { id: true },
    });

    if (!event) {
      return NextResponse.json({ error: "Événement non trouvé" }, { status: 404 });
    }

    const body = await request.json();
    const { guestId } = body;

    if (!guestId) {
      return NextResponse.json({ error: "guestId requis" }, { status: 400 });
    }

    await prisma.guest.delete({
      where: { id: guestId, eventId: event.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Guest delete error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
