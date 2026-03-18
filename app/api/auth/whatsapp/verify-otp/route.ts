import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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
