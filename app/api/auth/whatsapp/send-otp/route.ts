export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * POST /api/auth/whatsapp/send-otp
 * Generates and stores a 6-digit OTP for WhatsApp login.
 * MVP: returns the OTP in the response (in production, send via WhatsApp Business API).
 */
export async function POST(request: Request) {
  try {
    // Rate limiting: 5 OTP par IP par 15 minutes
    const ip = getClientIp(request);
    const rl = await rateLimit(`otp:${ip}`, 5, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Trop de demandes. Réessayez dans quelques minutes." },
        { status: 429 }
      );
    }

    const { phone } = await request.json();

    if (!phone || typeof phone !== "string") {
      return NextResponse.json(
        { error: "Numéro de téléphone requis" },
        { status: 400 }
      );
    }

    // Normalize phone number (basic cleanup)
    const normalizedPhone = phone.replace(/\s/g, "").trim();

    if (!/^\+?[0-9]{8,15}$/.test(normalizedPhone)) {
      return NextResponse.json(
        { error: "Format de numéro invalide" },
        { status: 400 }
      );
    }

    // Invalidate any existing unused OTPs for this phone
    await prisma.otpCode.updateMany({
      where: { phone: normalizedPhone, used: false },
      data: { used: true },
    });

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP with 5-minute expiration
    await prisma.otpCode.create({
      data: {
        phone: normalizedPhone,
        code,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      },
    });

    // ──────────────────────────────────────────────────────────
    // MVP: Return OTP in response for development/testing
    // TODO: In production, send OTP via WhatsApp Business API
    // and remove the `devCode` field from the response.
    // ──────────────────────────────────────────────────────────

    console.log(`[WhatsApp OTP] Code for ${normalizedPhone}: ${code}`);

    return NextResponse.json({
      success: true,
      message: "Code OTP envoyé",
      devCode: process.env.NODE_ENV === "development" ? code : undefined,
    });
  } catch (error) {
    console.error("[WhatsApp OTP] Error sending OTP:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'envoi du code" },
      { status: 500 }
    );
  }
}
