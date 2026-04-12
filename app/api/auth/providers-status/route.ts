import { NextResponse } from "next/server";

/**
 * GET /api/auth/providers-status
 * Returns which OAuth providers are configured and active.
 * This lets the login/register pages dynamically show/hide buttons.
 */
export async function GET() {
  return NextResponse.json({
    google: !!(
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      !process.env.GOOGLE_CLIENT_ID.startsWith("your-")
    ),
    apple: !!(
      process.env.APPLE_CLIENT_ID &&
      process.env.APPLE_CLIENT_SECRET &&
      !process.env.APPLE_CLIENT_ID.startsWith("your-") &&
      !process.env.APPLE_CLIENT_SECRET.startsWith("your-")
    ),
    whatsapp: true, // Always available (OTP-based, no external API needed for MVP)
  });
}
