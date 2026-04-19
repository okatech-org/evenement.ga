export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import convexClient from "@/lib/convex-server";
import { api } from "@/convex/_generated/api";

/**
 * GET /api/verify/[token] — Info event + stats pour la page controller (public).
 * Migré Prisma → Convex : lit controllerLinks + guests + qrScans depuis Convex.
 */
export async function GET(
  _request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const data = await convexClient.query(api.controllers.getByTokenWithStats, {
      token: params.token,
    });

    if (!data) {
      return NextResponse.json(
        { success: false, error: "Lien invalide ou introuvable" },
        { status: 404 }
      );
    }

    if (!data.link.isActive) {
      return NextResponse.json(
        { success: false, error: "Ce lien a été désactivé par l'organisateur" },
        { status: 403 }
      );
    }

    if (data.link.expired) {
      return NextResponse.json(
        { success: false, error: "Ce lien a expiré" },
        { status: 403 }
      );
    }

    if (data.event.status !== "PUBLISHED") {
      return NextResponse.json(
        { success: false, error: "Cet événement n'est pas encore publié" },
        { status: 403 }
      );
    }

    // Touche lastUsedAt (best-effort — non bloquant)
    convexClient
      .mutation(api.controllers.touchLastUsed, {
        linkId: data.link.id,
      })
      .catch(() => {});

    return NextResponse.json({
      success: true,
      data: {
        event: {
          title: data.event.title,
          type: data.event.type,
          date: new Date(data.event.date).toISOString(),
        },
        controller: {
          label: data.link.label,
          permission: data.link.permission,
        },
        stats: data.stats,
      },
    });
  } catch (error) {
    console.error("Verify GET error:", error);
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/verify/[token] — Verify/scan un invité via controller link (public).
 * Body : { query: string, action?: "scan" | "verify" }
 */
export async function POST(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    // Rate limit : 30 req/min par IP
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

    const result = await convexClient.mutation(api.controllers.verifyAndScan, {
      token: params.token,
      query,
      action: typeof action === "string" ? action : undefined,
    });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    // Mapper les erreurs Convex métier → HTTP appropriés
    if (message.includes("Lien invalide")) {
      return NextResponse.json({ success: false, error: message }, { status: 404 });
    }
    if (message.includes("désactivé") || message.includes("expiré")) {
      return NextResponse.json({ success: false, error: message }, { status: 403 });
    }
    console.error("Verify POST error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
