export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { verifyCsrf } from "@/lib/api-guards";
import { slugify } from "@/lib/utils";
import { checkEventLimit } from "@/lib/plan-guard";
import { getDefaultModulesForType, getDefaultPresetForType } from "@/lib/modules/defaults";
import type { EventType, Plan } from "@/lib/types";
import { logSystem } from "@/lib/superadmin/logger";
import convexClient from "@/lib/convex-server";
import { api } from "@/convex/_generated/api";

/**
 * GET /api/events — List events for the authenticated user (migré Convex)
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const events = await convexClient.query(api.events.listByEmail, {
    email: session.user.email,
  });

  return NextResponse.json({ success: true, data: events });
}

/**
 * POST /api/events — Create a new event (migré Convex)
 */
export async function POST(request: Request) {
  const csrfError = verifyCsrf(request);
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, eventType, date, dates, location, venues } = body;

    if (!title || !eventType) {
      return NextResponse.json(
        { error: "Titre et type requis" },
        { status: 400 }
      );
    }

    // Vérifier la limite d'events du plan (plan-guard utilise déjà Convex)
    const planCheck = await checkEventLimit(
      session.user.email,
      (session.user.plan ?? "FREE") as Plan
    );
    if (!planCheck.allowed) {
      return NextResponse.json(
        { error: planCheck.reason, requiredPlan: planCheck.requiredPlan },
        { status: 403 }
      );
    }

    // Support both single date and dates array
    const eventDates: string[] = dates && dates.length > 0
      ? dates
      : date
      ? [date]
      : [];

    if (eventDates.length === 0) {
      return NextResponse.json(
        { error: "Au moins une date requise" },
        { status: 400 }
      );
    }

    // Generate unique slug
    let slug = slugify(title);
    const taken = await convexClient.query(api.events.isSlugTaken, { slug });
    if (taken) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    // Convertir les dates ISO en timestamps (Convex stocke les timestamps)
    const datesTimestamps = eventDates.map((d) => new Date(d).getTime());

    // Use location fallback from venues
    const finalLocation =
      location || (venues && venues.length > 0 ? venues[0].name : undefined);

    const event = await convexClient.mutation(
      api.events.createWithDefaults,
      {
        email: session.user.email,
        title,
        slug,
        type: eventType as EventType,
        dates: datesTimestamps,
        location: finalLocation,
        presetId: getDefaultPresetForType(eventType as EventType),
        modules: getDefaultModulesForType(eventType as EventType).map((m) => ({
          type: m.type,
          order: m.order,
          active: m.active,
        })),
      }
    );

    logSystem("INFO", "EVENT", "EVENT_CREATED", {
      actorId: session.user.id,
      targetId: event.id,
      metadata: { title: event.title, type: eventType },
    });

    return NextResponse.json(
      { success: true, data: event },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create event error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
