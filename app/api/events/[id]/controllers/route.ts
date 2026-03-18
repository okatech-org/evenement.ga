import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { randomBytes } from "crypto";

/**
 * GET /api/events/[id]/controllers — List controller links for an event
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

    const links = await prisma.controllerLink.findMany({
      where: { eventId: params.id },
      include: {
        _count: { select: { scans: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const baseUrl = process.env.NEXTAUTH_URL || "https://evenement.ga";

    return NextResponse.json({
      success: true,
      data: links.map((link) => ({
        id: link.id,
        token: link.token,
        label: link.label,
        permission: link.permission,
        isActive: link.isActive,
        expiresAt: link.expiresAt?.toISOString() || null,
        createdAt: link.createdAt.toISOString(),
        lastUsedAt: link.lastUsedAt?.toISOString() || null,
        scanCount: link._count.scans,
        url: `${baseUrl}/verify/${link.token}`,
      })),
    });
  } catch (error) {
    console.error("List controller links error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * POST /api/events/[id]/controllers — Create a new controller link
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
      select: { id: true },
    });

    if (!event) {
      return NextResponse.json({ error: "Événement non trouvé" }, { status: 404 });
    }

    const body = await request.json();
    const { label, permission, expiresAt } = body;

    if (!label || typeof label !== "string" || label.trim().length === 0) {
      return NextResponse.json({ error: "Le libellé est requis" }, { status: 400 });
    }

    const token = randomBytes(16).toString("hex");
    const baseUrl = process.env.NEXTAUTH_URL || "https://evenement.ga";

    const link = await prisma.controllerLink.create({
      data: {
        eventId: params.id,
        token,
        label: label.trim(),
        permission: permission === "SCAN" ? "SCAN" : "VERIFY",
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: link.id,
        token: link.token,
        label: link.label,
        permission: link.permission,
        isActive: link.isActive,
        expiresAt: link.expiresAt?.toISOString() || null,
        createdAt: link.createdAt.toISOString(),
        scanCount: 0,
        url: `${baseUrl}/verify/${link.token}`,
      },
    });
  } catch (error) {
    console.error("Create controller link error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * DELETE /api/events/[id]/controllers — Delete or toggle a controller link
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
    const { linkId, action } = body;

    if (!linkId) {
      return NextResponse.json({ error: "linkId requis" }, { status: 400 });
    }

    const link = await prisma.controllerLink.findFirst({
      where: { id: linkId, eventId: params.id },
    });

    if (!link) {
      return NextResponse.json({ error: "Lien non trouvé" }, { status: 404 });
    }

    if (action === "toggle") {
      await prisma.controllerLink.update({
        where: { id: linkId },
        data: { isActive: !link.isActive },
      });
      return NextResponse.json({
        success: true,
        data: { isActive: !link.isActive },
      });
    }

    // Default: delete
    await prisma.controllerLink.delete({
      where: { id: linkId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete controller link error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
