import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { DEMO_ACCOUNTS, type DemoAccountType } from "@/lib/demo-guard";

// ─── Simple in-memory rate limiter ──────────────────────────
const rateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimit.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

export async function POST(req: Request) {
  try {
    // Rate limit check
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        {
          success: false,
          error: "Trop de connexions démo. Réessayez dans une heure.",
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const accountType = body.accountType as string;

    if (!accountType || !(accountType in DEMO_ACCOUNTS)) {
      return NextResponse.json(
        {
          success: false,
          error: "Type de compte invalide.",
        },
        { status: 400 }
      );
    }

    const account = DEMO_ACCOUNTS[accountType as DemoAccountType];

    // Verify the demo user exists in DB
    const user = await prisma.user.findUnique({
      where: { email: account.email },
    });

    if (!user || !user.isDemoAccount) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Compte démo introuvable. Les données démo n'ont peut-être pas été initialisées.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        email: account.email,
        password: "demo1234",
        redirectUrl: account.redirectUrl,
      },
    });
  } catch (error) {
    console.error("[Demo Login] Error:", error);
    return NextResponse.json(
      { success: false, error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}
