import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * POST /api/auth/whatsapp/verify-otp
 * Verifies an OTP code for a given phone number.
 * Returns success if valid, allowing the client to proceed with signIn("whatsapp-otp").
 */
export async function POST(request: Request) {
  try {
    const { phone, otp } = await request.json();

    if (!phone || !otp) {
      return NextResponse.json(
        { error: "Numéro de téléphone et code OTP requis" },
        { status: 400 }
      );
    }

    const normalizedPhone = phone.replace(/\s/g, "").trim();

    // Valider le format du telephone
    if (!/^\+?[0-9]{8,15}$/.test(normalizedPhone)) {
      return NextResponse.json(
        { error: "Format de numéro invalide" },
        { status: 400 }
      );
    }

    // Rate limiting par IP: 5 tentatives par 15 minutes
    const ip = getClientIp(request);
    const ipRl = await rateLimit(`otp-verify:${ip}`, 5, 15 * 60 * 1000);
    if (!ipRl.allowed) {
      return NextResponse.json(
        { error: "Trop de tentatives. Réessayez dans quelques minutes." },
        { status: 429 }
      );
    }

    // Rate limiting par telephone: 3 tentatives par 5 minutes
    const phoneRl = await rateLimit(`otp-verify:${normalizedPhone}`, 3, 5 * 60 * 1000);
    if (!phoneRl.allowed) {
      return NextResponse.json(
        { error: "Trop de tentatives pour ce numéro. Réessayez dans quelques minutes." },
        { status: 429 }
      );
    }

    // Find valid OTP
    const otpRecord = await prisma.otpCode.findFirst({
      where: {
        phone: normalizedPhone,
        code: otp,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
      return NextResponse.json(
        { error: "Code OTP invalide ou expiré" },
        { status: 400 }
      );
    }

    // Marquer l'OTP comme utilise immediatement
    await prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { used: true },
    });

    return NextResponse.json({
      success: true,
      message: "Code vérifié avec succès",
    });
  } catch (error) {
    console.error("[WhatsApp OTP] Error verifying OTP:", error);
    return NextResponse.json(
      { error: "Erreur lors de la vérification du code" },
      { status: 500 }
    );
  }
}
