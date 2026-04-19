export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { verifyCsrf } from "@/lib/api-guards";
import { randomBytes } from "crypto";
import convexClient from "@/lib/convex-server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

function buildUrl(token: string) {
  const baseUrl = process.env.NEXTAUTH_URL || "https://evenement.ga";
  return `${baseUrl}/verify/${token}`;
}

/**
 * GET /api/events/[id]/controllers — Liste les controller links (Convex).
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
    const links = await convexClient.query(api.controllers.listByEvent, {
      eventId: params.id as Id<"events">,
      email: session.user.email,
    });

    return NextResponse.json({
      success: true,
      data: links.map((link) => ({
        id: link.id,
        token: link.token,
        label: link.label,
        permission: link.permission,
        isActive: link.isActive,
        expiresAt: link.expiresAt ? new Date(link.expiresAt).toISOString() : null,
        createdAt: new Date(link.createdAt).toISOString(),
        lastUsedAt: link.lastUsedAt ? new Date(link.lastUsedAt).toISOString() : null,
        scanCount: link.scanCount,
        url: buildUrl(link.token),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    const status = message.includes("access denied") || message.includes("not found") ? 404 : 500;
    console.error("List controller links error:", error);
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * POST /api/events/[id]/controllers — Crée un controller link.
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
    const { label, permission, expiresAt } = body;

    if (!label || typeof label !== "string" || label.trim().length === 0) {
      return NextResponse.json({ error: "Le libellé est requis" }, { status: 400 });
    }

    const token = randomBytes(16).toString("hex");
    const expiresAtMs =
      expiresAt !== undefined && expiresAt !== null
        ? typeof expiresAt === "number"
          ? expiresAt
          : new Date(expiresAt).getTime()
        : undefined;

    const link = await convexClient.mutation(api.controllers.create, {
      eventId: params.id as Id<"events">,
      email: session.user.email,
      token,
      label: label.trim(),
      permission: permission === "SCAN" ? "SCAN" : "VERIFY",
      expiresAt: expiresAtMs,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: link.id,
        token: link.token,
        label: link.label,
        permission: link.permission,
        isActive: link.isActive,
        expiresAt: link.expiresAt ? new Date(link.expiresAt).toISOString() : null,
        createdAt: new Date(link.createdAt).toISOString(),
        scanCount: 0,
        url: buildUrl(link.token),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    const status = message.includes("access denied") || message.includes("not found") ? 404 : 500;
    console.error("Create controller link error:", error);
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * DELETE /api/events/[id]/controllers — Supprime ou bascule isActive.
 * Body : { linkId: string, action?: "toggle" }
 */
export async function DELETE(
  request: Request,
  _ctx: { params: { id: string } }
) {
  const csrfError = verifyCsrf(request);
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { linkId, action } = body;

    if (!linkId) {
      return NextResponse.json({ error: "linkId requis" }, { status: 400 });
    }

    if (action === "toggle") {
      const result = await convexClient.mutation(api.controllers.toggle, {
        linkId: linkId as Id<"controllerLinks">,
        email: session.user.email,
      });
      return NextResponse.json({ success: true, data: result });
    }

    await convexClient.mutation(api.controllers.remove, {
      linkId: linkId as Id<"controllerLinks">,
      email: session.user.email,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    const status = message.includes("Access denied") || message.includes("non trouvé") ? 404 : 500;
    console.error("Delete/toggle controller link error:", error);
    return NextResponse.json({ error: message }, { status });
  }
}
