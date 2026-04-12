import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// ─── CSRF Protection ────────────────────────────────────
// Verifie le header Origin sur les requetes mutantes (POST/PUT/DELETE/PATCH)

const ALLOWED_ORIGINS = [
  process.env.NEXTAUTH_URL,
  process.env.NEXT_PUBLIC_APP_URL,
  "http://localhost:3000",
  "http://localhost:8080",
].filter(Boolean) as string[];

export function verifyCsrf(request: Request): NextResponse | null {
  const method = request.method.toUpperCase();
  if (!["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
    return null;
  }

  const origin = request.headers.get("origin");

  // Les requetes sans Origin (navigation, meme origine) sont autorisees
  if (!origin) {
    return null;
  }

  const isAllowed = ALLOWED_ORIGINS.some((allowed) => {
    try {
      const allowedUrl = new URL(allowed);
      const originUrl = new URL(origin);
      return allowedUrl.origin === originUrl.origin;
    } catch {
      return allowed === origin;
    }
  });

  if (!isAllowed) {
    return NextResponse.json(
      { error: "Forbidden — origin not allowed" },
      { status: 403 }
    );
  }

  return null;
}

// ─── Auth Guard ─────────────────────────────────────────
// Wrapper autour de auth() avec reponse 401 standardisee

export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    return { session: null, error: NextResponse.json({ error: "Non autorisé" }, { status: 401 }) };
  }
  return { session, error: null };
}

// ─── Event Ownership ────────────────────────────────────
// Verifie que l'evenement appartient a l'utilisateur

export async function verifyEventOwnership(eventId: string, userId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId, userId },
  });
  return event;
}
