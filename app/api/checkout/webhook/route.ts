export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import convexClient from "@/lib/convex-server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type Stripe from "stripe";

/**
 * POST /api/checkout/webhook — Stripe envoie les événements de paiement ici.
 * À configurer dans le dashboard Stripe avec l'URL publique de cette route.
 *
 * Utilise STRIPE_WEBHOOK_SECRET pour valider la signature.
 *
 * Événements traités :
 *  - checkout.session.completed : met à jour events.tier via Convex mutation
 */
export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe non configuré" },
      { status: 503 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET manquant — rejet du webhook");
    return NextResponse.json(
      { error: "Webhook secret non configuré" },
      { status: 500 }
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Signature manquante" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signature invalide";
    console.error("Webhook signature check failed:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const eventId = session.metadata?.eventId;
        const tierId = session.metadata?.tierId;

        if (!eventId || !tierId) {
          console.warn(
            "checkout.session.completed reçu sans eventId/tierId metadata",
            session.id
          );
          break;
        }

        // Idempotent : Convex patch — si le tier est déjà défini, ça réécrit simplement.
        await convexClient.mutation(api.events.setTier, {
          eventId: eventId as Id<"events">,
          tier: tierId,
        });
        break;
      }

      // Autres événements ignorés pour l'instant
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    const message = error instanceof Error ? error.message : "Erreur interne";
    // Retour 500 → Stripe réessayera (important pour idempotence)
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
