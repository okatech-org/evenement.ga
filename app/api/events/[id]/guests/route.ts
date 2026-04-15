export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { verifyCsrf } from "@/lib/api-guards";
import { checkGuestLimit } from "@/lib/plan-guard";
import { AddGuestSchema } from "@/lib/validations";
import { z } from "zod";
import { randomBytes } from "crypto";
import QRCode from "qrcode";
import type { Plan } from "@/lib/types";
import { logSystem } from "@/lib/superadmin/logger";
import convexClient from "@/lib/convex-server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

/**
 * GET /api/events/[id]/guests — List all guests (migré Convex)
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const event = await convexClient.query(api.events.getForAdmin, {
      id: params.id as Id<"events">,
      email: session.user.email,
    });

    if (!event) {
      return NextResponse.json({ error: "Événement non trouvé" }, { status: 404 });
    }

    const guests = await convexClient.query(api.guests.listByEvent, {
      eventId: event._id,
    });

    const baseUrl = process.env.NEXTAUTH_URL || "https://evenement.ga";

    return NextResponse.json({
      success: true,
      data: guests.map((g) => ({
        id: g._id,
        firstName: g.firstName,
        lastName: g.lastName,
        email: g.email ?? null,
        phone: g.phone ?? null,
        group: g.group ?? null,
        status: g.status,
        inviteToken: g.inviteToken ?? null,
        inviteUrl: g.inviteToken
          ? `${baseUrl}/${event.slug}?guest=${g.inviteToken}`
          : null,
        hasRsvp: !!g.rsvp,
        presence: g.rsvp?.presence ?? null,
        createdAt: new Date(g._creationTime).toISOString(),
      })),
    });
  } catch (error) {
    console.error("Guest list error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * POST /api/events/[id]/guests — Add a new guest (migré Convex)
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const csrfError = verifyCsrf(request);
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const event = await convexClient.query(api.events.getForAdmin, {
      id: params.id as Id<"events">,
      email: session.user.email,
    });

    if (!event) {
      return NextResponse.json({ error: "Événement non trouvé" }, { status: 404 });
    }

    const body = await request.json();
    const validatedGuest = AddGuestSchema.parse(body);
    const { firstName, lastName } = validatedGuest;
    const guestEmail = validatedGuest.email || undefined;
    const phone = validatedGuest.phone || undefined;
    const group = validatedGuest.group || undefined;

    // Vérifier la limite du plan
    const guestCheck = await checkGuestLimit(
      event._id,
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

    // Generate QR code data URL
    const qrDataUrl = await QRCode.toDataURL(scanUrl, {
      width: 400,
      margin: 2,
      color: { dark: "#1A202C", light: "#FFFFFF" },
      errorCorrectionLevel: "M",
    });

    const guest = await convexClient.mutation(api.guests.create, {
      eventId: event._id,
      email: session.user.email,
      firstName,
      lastName,
      guestEmail,
      phone,
      group,
      inviteToken,
      qrToken: scanUrl,
    });

    if (!guest) {
      return NextResponse.json({ error: "Erreur de création" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: guest._id,
        firstName: guest.firstName,
        lastName: guest.lastName,
        email: guest.email ?? null,
        phone: guest.phone ?? null,
        group: guest.group ?? null,
        inviteToken: guest.inviteToken ?? null,
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
  const csrfError = verifyCsrf(request);
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { guestId } = body;

    if (!guestId) {
      return NextResponse.json({ error: "guestId requis" }, { status: 400 });
    }

    await convexClient.mutation(api.guests.remove, {
      guestId: guestId as Id<"guests">,
      eventId: params.id as Id<"events">,
      email: session.user.email,
    });

    logSystem("INFO", "EVENT", "GUEST_DELETED", {
      actorId: session.user.id,
      targetId: guestId,
      metadata: { eventId: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Guest delete error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
