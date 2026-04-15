export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { verifyCsrf } from "@/lib/api-guards";
import convexClient from "@/lib/convex-server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

/**
 * PUT /api/events/[id]/modules — Update modules order and activation (migré Convex)
 */
export async function PUT(
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
    const body = await request.json();
    const { modules } = body as {
      modules: {
        id: string;
        type: string;
        active: boolean;
        order: number;
        configJson?: unknown;
      }[];
    };

    // configJson est un objet → stringify pour Convex (stocké en v.string())
    const payload = modules.map((m) => ({
      id: m.id as Id<"eventModules">,
      active: m.active,
      order: m.order,
      ...(m.configJson !== undefined
        ? { configJson: JSON.stringify(m.configJson) }
        : {}),
    }));

    await convexClient.mutation(api.modules.patchByIds, {
      eventId: params.id as Id<"events">,
      email: session.user.email,
      modules: payload,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update modules error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
