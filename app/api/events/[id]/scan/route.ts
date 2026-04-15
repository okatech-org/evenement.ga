export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { verifyCsrf } from "@/lib/api-guards";
import convexClient from "@/lib/convex-server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

/**
 * POST /api/events/[id]/scan — Scan QR code and record entry (migré Convex)
 * Supports: guestId (legacy), qrToken (URL from QR), inviteToken (token from URL)
 *
 * Returns guest info: name, counts, menu, allergies, group
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
    const body = await request.json();
    const { guestId, qrToken, inviteToken, scannedUrl } = body;

    // Verify ownership via Convex
    const event = await convexClient.query(api.events.getForAdmin, {
      id: params.id as Id<"events">,
      email: session.user.email,
    });

    if (!event) {
      return NextResponse.json({ error: "Événement non trouvé" }, { status: 404 });
    }

    // Resolve scanner user ID in Convex
    const user = await convexClient.query(api.users.getByEmail, {
      email: session.user.email,
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 401 });
    }

    // Call the Convex scanByToken mutation
    const result = await convexClient.mutation(api.qr.scanByToken, {
      eventId: event._id,
      scannedBy: user._id,
      ...(guestId ? { guestId } : {}),
      ...(qrToken ? { qrToken } : {}),
      ...(inviteToken ? { inviteToken } : {}),
      ...(scannedUrl ? { scannedUrl } : {}),
    });

    return NextResponse.json({
      success: true,
      scan: result,
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
 * GET /api/events/[id]/scan — Get scan history (migré Convex)
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
    // Verify ownership via Convex
    const event = await convexClient.query(api.events.getForAdmin, {
      id: params.id as Id<"events">,
      email: session.user.email,
    });

    if (!event) {
      return NextResponse.json({ error: "Événement non trouvé" }, { status: 404 });
    }

    const data = await convexClient.query(api.qr.scanHistory, {
      eventId: event._id,
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Scan history error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
