export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/health — Health check endpoint
 * Verifie la connectivite DB et retourne le statut
 */
export async function GET() {
  try {
    // Verifier la connexion a la base de donnees
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      database: "connected",
    });
  } catch {
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        database: "disconnected",
      },
      { status: 503 }
    );
  }
}
