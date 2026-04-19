export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { verifyCsrf } from "@/lib/api-guards";
import { getStripe } from "@/lib/stripe";
import { INVITATION_TIERS } from "@/lib/config";
import convexClient from "@/lib/convex-server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

/**
 * POST /api/checkout/session — Crée une session Stripe Checkout pour acheter
 * un tier d'invitation pour un event donné.
 *
 * Body : { tierId: string, eventId: string }
 */
export async function POST(request: Request) {
  const csrfError = verifyCsrf(request);
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      {
        error:
          "Paiement temporairement indisponible. Définissez STRIPE_SECRET_KEY pour activer le checkout.",
        code: "STRIPE_NOT_CONFIGURED",
      },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { tierId, eventId } = body as { tierId?: string; eventId?: string };

    if (!tierId || !eventId) {
      return NextResponse.json(
        { error: "tierId et eventId requis" },
        { status: 400 }
      );
    }

    const tier = INVITATION_TIERS.find((t) => t.id === tierId);
    if (!tier) {
      return NextResponse.json({ error: "Tier inconnu" }, { status: 400 });
    }
    if (tier.price === 0) {
      return NextResponse.json(
        { error: "Ce tier est gratuit — aucun paiement requis" },
        { status: 400 }
      );
    }

    // Vérifier l'ownership event via Convex
    const event = await convexClient.query(api.events.getForAdmin, {
      id: eventId as Id<"events">,
      email: session.user.email,
    });
    if (!event) {
      return NextResponse.json(
        { error: "Événement introuvable ou accès refusé" },
        { status: 404 }
      );
    }

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3004";
    const amountCents = Math.round(tier.price * 100);

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: session.user.email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `EventFlow — ${tier.label}`,
              description: `${tier.subtitle} · ${tier.minGuests}-${tier.maxGuests} invités · Événement : ${event.title}`,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/events/${eventId}?checkout=success&tier=${tierId}`,
      cancel_url: `${baseUrl}/plans?checkout=cancelled`,
      metadata: {
        eventId,
        tierId,
        userEmail: session.user.email,
      },
    });

    return NextResponse.json({
      success: true,
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (error) {
    console.error("Checkout session error:", error);
    const message = error instanceof Error ? error.message : "Erreur interne";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
