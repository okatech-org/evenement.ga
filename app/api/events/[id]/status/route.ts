export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { verifyCsrf } from "@/lib/api-guards";
import type { EventStatus } from "@/lib/types";
import { logSystem } from "@/lib/superadmin/logger";
import convexClient from "@/lib/convex-server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

/**
 * POST /api/events/[id]/status — Update event status (migré vers Convex)
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const csrfError = verifyCsrf(request);
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    // Support à la fois JSON et form-encoded (bouton Publier envoie du form-data)
    const contentType = request.headers.get("content-type") || "";
    let status: EventStatus;
    if (contentType.includes("application/json")) {
      const body = await request.json();
      status = body.status as EventStatus;
    } else {
      const form = await request.formData();
      status = form.get("status") as EventStatus;
    }

    if (!["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status)) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }

    await convexClient.mutation(api.events.updateStatus, {
      id: params.id as Id<"events">,
      status,
      email: session.user.email,
    });

    logSystem("INFO", "EVENT", "STATUS_CHANGED", {
      actorId: session.user.id,
      targetId: params.id,
      metadata: { status },
    });

    // Si c'était une form-submit (page.tsx utilise <form action=...>),
    // rediriger vers la page détail event. Sinon, JSON OK.
    if (!contentType.includes("application/json")) {
      const url = new URL(request.url);
      return NextResponse.redirect(
        new URL(`/events/${params.id}`, url.origin),
        303
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update status error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
